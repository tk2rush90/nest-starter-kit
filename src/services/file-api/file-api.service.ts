import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import { UploadDetailService } from '../upload-detail/upload-detail.service';
import { basename, extname, join } from 'path';
import { toInteger } from 'lodash';
import { createReadStream, readFileSync } from 'fs';
import { Request, Response } from 'express';
import { UploadDetail } from '../../entities/upload-detail';
import { EntityManager } from 'typeorm';
import { createFile, deleteFileIfExists, getFileSize, resizeGif, resizeToWebP } from '../../utils/file';
import { UploadFilesDto } from '../../dtos/upload-files-dto';
import { configs } from '../../configs/configs';
import { createUUID } from '../../utils/crypto';

@Injectable()
export class FileApiService {
  private readonly _logger = new Logger('FileApiService');

  constructor(
    private readonly _entityManager: EntityManager,
    private readonly _uploadedDetailService: UploadDetailService,
  ) {}

  /**
   * Get streamable file by id of uploaded detail.
   * @param requestUUID
   * @param request
   * @param response
   * @param uploadedDetailId
   * @throws UPLOADED_DETAIL_NOT_FOUND
   */
  async getFileStream(
    requestUUID: string,
    request: Request,
    response: Response,
    uploadedDetailId: string,
  ): Promise<StreamableFile> {
    const uploadedDetail = await this._uploadedDetailService.getOneById({
      id: uploadedDetailId,
    });

    this._logger.log(`[${requestUUID}] Uploaded detail found: ${uploadedDetailId}`);

    const filePath = join(uploadedDetail.storagePath, uploadedDetail.filename);

    if (uploadedDetail.mimetype.startsWith('video') && request.headers.range) {
      this._logger.log(`[${requestUUID}] Create StreamableFile for video`);

      const fileSize = toInteger(uploadedDetail.fileSize);

      const parts = request.headers.range.replace(/bytes=/, '').split('-');

      const start = parseInt(parts[0], 10);

      const end = parts[1] ? parseInt(parts[1], 10) : undefined;

      this._logger.log(`[${requestUUID}] Streamable parts from ${start} to ${end}`);

      const readStream = createReadStream(filePath, { start, end });

      this._logger.log(`[${requestUUID}] Read stream is created`);

      const contentRange = `bytes ${start}-${end || (readStream.bytesRead || fileSize) - 1}/${readStream.bytesRead || fileSize}`;

      this._logger.log(`[${requestUUID}] Content range: ${contentRange}`);

      response.status(206); // Partial Content
      response.setHeader('Content-Range', contentRange);
      response.setHeader('Accept-Ranges', 'bytes');
      response.setHeader('Cache-Control', 'max-age=3153600');

      return new StreamableFile(readStream);
    } else {
      this._logger.log(`[${requestUUID}] Create StreamableFile for not video`);

      response.setHeader('Cache-Control', 'max-age=3153600');

      return new StreamableFile(readFileSync(filePath));
    }
  }

  /**
   * Create uploaded details for uploaded files.
   * Files are saved to the destination by multer on request started.
   * After created, return ids with extension of created details.
   * @param requestUUID
   * @param files
   * @param width
   */
  async uploadFiles(requestUUID: string, files: Express.Multer.File[], { width }: UploadFilesDto): Promise<string[]> {
    const uploadedDetails: UploadDetail[] = [];

    await this._entityManager
      .transaction(async (entityManager) => {
        for (const _file of files) {
          _file.destination = configs.paths.files;
          _file.filename = createUUID() + extname(_file.originalname); // Keep extension.

          const filePath = join(_file.destination, _file.filename);

          if (_file.mimetype === 'image/gif' && width) {
            _file.buffer = await resizeGif(_file.buffer, width);
          } else if (_file.mimetype !== 'image/svg+xml' && _file.mimetype.startsWith('image') && width) {
            _file.filename = createUUID() + basename(_file.originalname, extname(_file.originalname)) + '.webp'; // Replace to webp format.
            _file.buffer = await resizeToWebP(_file.buffer, width);
          }

          createFile(filePath, _file.buffer);

          _file.size = getFileSize(filePath);

          uploadedDetails.push(
            await this._uploadedDetailService.create({
              file: _file,
              entityManager,
            }),
          );
        }

        this._logger.log(`[${requestUUID}] Uploaded details created`);
      })
      .catch((e) => {
        this._logger.error(`[${requestUUID}] Error while creating uploaded details: ${e.toString()}`, e.stack);

        throw e;
      });

    return uploadedDetails.map((_uploadedDetail) => _uploadedDetail.id + extname(_uploadedDetail.filename));
  }

  /**
   * Delete file by id.
   * @param requestUUID
   * @param uploadedDetailId
   * @throws UPLOADED_DETAIL_NOT_FOUND
   */
  async deleteFile(requestUUID: string, uploadedDetailId: string): Promise<void> {
    const uploadedDetail = await this._uploadedDetailService.getOneById({
      id: uploadedDetailId,
    });

    this._logger.log(`[${requestUUID}] Uploaded detail is found: ${uploadedDetailId}`);

    await this._uploadedDetailService.delete({
      id: uploadedDetail.id,
    });

    deleteFileIfExists(join(uploadedDetail.storagePath, uploadedDetail.filename));
  }
}
