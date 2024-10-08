import {
  Body,
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
import { Request, Response } from 'express';
import { createUUID } from '../../utils/crypto';
import { AuthGuard } from '../../guards/auth/auth.guard';
import { FileApiService } from '../../services/file-api/file-api.service';
import { UploadFilesDto } from '../../dtos/upload-files-dto';
import { basename, extname } from 'path';

@Controller('file')
export class FileApiController {
  private readonly _logger = new Logger('FileApiController');

  constructor(private readonly _fileApiService: FileApiService) {}

  /**
   * Streaming file.
   * @param request
   * @param response
   * @param uploadedDetailName - Should include extension
   * @throws UPLOADED_DETAIL_NOT_FOUND
   */
  @Get(':name')
  async getFileStream(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('name') uploadedDetailName: string,
  ): Promise<StreamableFile> {
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] GET /file/:id`);

    return this._fileApiService.getFileStream(
      requestUUID,
      request,
      response,
      basename(uploadedDetailName, extname(uploadedDetailName)),
    );
  }

  /**
   * Upload files and return uploaded ids.
   * @param files
   * @param uploadFilesDto
   */
  @Post('upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('files'))
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
    @Body() uploadFilesDto: UploadFilesDto,
  ): Promise<string[]> {
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] POST /file/upload`);

    return this._fileApiService.uploadFiles(requestUUID, files, uploadFilesDto);
  }

  /**
   * Delete file by name.
   * @param uploadedDetailName
   * @throws UPLOADED_DETAIL_NOT_FOUND
   */
  @Delete(':name')
  @UseGuards(AuthGuard)
  async deleteFile(@Param('name') uploadedDetailName: string): Promise<void> {
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] DELETE /file/:id`);

    return this._fileApiService.deleteFile(requestUUID, basename(uploadedDetailName, extname(uploadedDetailName)));
  }
}
