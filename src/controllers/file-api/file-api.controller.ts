import {
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UploadDetailService } from '../../services/upload-detail/upload-detail.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MB } from '../../constants/units';
import { configs } from '../../configs/configs';
import { diskStorage } from 'multer';
import { Request, Response } from 'express';
import { createUUID } from '../../utils/crypto';
import { extname, join } from 'path';
import { UploadDetail } from '../../entities/upload-detail';
import { createReadStream, readFileSync } from 'fs';
import { toInteger } from 'lodash';
import { AuthGuard } from '../../guards/auth/auth.guard';

@Controller('file')
export class FileApiController {
  constructor(private readonly _uploadedDetailService: UploadDetailService) {}

  /**
   * Streaming file.
   * @param request
   * @param response
   * @param uploadedDetailId
   * @throws UPLOADED_DETAIL_NOT_FOUND
   */
  @Get(':id')
  async getFileStream(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id') uploadedDetailId: string,
  ): Promise<StreamableFile> {
    const uploadedDetail = await this._uploadedDetailService.getUploadedDetailById(uploadedDetailId);

    const filePath = join(uploadedDetail.storagePath, uploadedDetail.filename);

    if (uploadedDetail.mimetype.startsWith('video') && request.headers.range) {
      const fileSize = toInteger(uploadedDetail.fileSize);

      const parts = request.headers.range.replace(/bytes=/, '').split('-');

      const start = parseInt(parts[0], 10);

      const end = parts[1] ? parseInt(parts[1], 10) : undefined;

      const readStream = createReadStream(filePath, { start, end });

      response.status(206); // Partial Content
      response.setHeader(
        'Content-Range',
        `bytes ${start}-${end || (readStream.bytesRead || fileSize) - 1}/${readStream.bytesRead || fileSize}`,
      );
      response.setHeader('Accept-Ranges', 'bytes');
      response.setHeader('Cache-Control', 'max-age=3153600');

      return new StreamableFile(readStream);
    } else {
      response.setHeader('Cache-Control', 'max-age=3153600');

      return new StreamableFile(readFileSync(filePath));
    }
  }

  /**
   * Upload files and return uploaded ids.
   * @param files
   */
  @Post('upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', undefined, {
      dest: configs.paths.files,
      storage: diskStorage({
        destination: configs.paths.files,
        filename(req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) {
          const randomFilename = createUUID() + extname(file.originalname); // Keep extension.

          callback(null, randomFilename);
        },
      }),
    }),
  )
  async uploadFiles(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            /(image\/png|image\/jpeg|image\/jpg|image\/gif|image\/webp|video\/mp4|video\/mov|video\/webm|video\/quicktime)/gim,
        })
        .addMaxSizeValidator({
          maxSize: 100 * MB,
        })
        .build(),
    )
    files: Express.Multer.File[],
  ): Promise<string[]> {
    const uploadedDetails: UploadDetail[] = [];

    for (const _file of files) {
      uploadedDetails.push(await this._uploadedDetailService.createUploadDetail(_file));
    }

    return uploadedDetails.map((_uploadedDetail) => _uploadedDetail.id);
  }

  /**
   * Delete file by id.
   * @param uploadedDetailId
   * @throws UPLOADED_DETAIL_NOT_FOUND
   */
  @Delete('delete/:id')
  @UseGuards(AuthGuard)
  async deleteFile(@Param('id') uploadedDetailId: string): Promise<void> {
    const uploadedDetail = await this._uploadedDetailService.getUploadedDetailById(uploadedDetailId);

    await this._uploadedDetailService.deleteUploadedDetail(uploadedDetail);
  }
}
