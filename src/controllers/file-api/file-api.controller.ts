import {
  Controller,
  Delete,
  Get,
  Logger,
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
import { FilesInterceptor } from '@nestjs/platform-express';
import { MB } from '../../constants/units';
import { configs } from '../../configs/configs';
import { diskStorage } from 'multer';
import { Request, Response } from 'express';
import { createUUID } from '../../utils/crypto';
import { extname } from 'path';
import { AuthGuard } from '../../guards/auth/auth.guard';
import { FileApiService } from '../../services/file-api/file-api.service';

@Controller('file')
export class FileApiController {
  private readonly _logger = new Logger('FileApiController');

  constructor(private readonly _fileApiService: FileApiService) {}

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
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] GET /file/:id`);

    return this._fileApiService.getFileStream(requestUUID, request, response, uploadedDetailId);
  }

  /**
   * Upload files and return uploaded ids.
   * @param files
   */
  @Post('upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', undefined, {
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
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] POST /file/upload`);

    return this._fileApiService.uploadFiles(requestUUID, files);
  }

  /**
   * Delete file by id.
   * @param uploadedDetailId
   * @throws UPLOADED_DETAIL_NOT_FOUND
   */
  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteFile(@Param('id') uploadedDetailId: string): Promise<void> {
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] DELETE /file/:id`);

    return this._fileApiService.deleteFile(requestUUID, uploadedDetailId);
  }
}
