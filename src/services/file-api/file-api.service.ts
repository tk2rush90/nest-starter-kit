import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import { UploadDetailService } from '../upload-detail/upload-detail.service';
import { join } from 'path';
import { toInteger } from 'lodash';
import { createReadStream, readFileSync } from 'fs';
import { Request, Response } from 'express';
import { UploadDetail } from '../../entities/upload-detail';
import { EntityManager } from 'typeorm';
import { deleteFileIfExists } from '../../utils/file';

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
    const uploadedDetail = await this._uploadedDetailService.getUploadedDetailById(uploadedDetailId);

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
   * After created, return ids of created details.
   * @param requestUUID
   * @param files
   */
  async uploadFiles(requestUUID: string, files: Express.Multer.File[]): Promise<string[]> {
    const uploadedDetails: UploadDetail[] = [];

    await this._entityManager
      .transaction(async (_entityManager) => {
        for (const _file of files) {
          uploadedDetails.push(await this._uploadedDetailService.createUploadDetail(_file, _entityManager));
        }

        this._logger.log(`[${requestUUID}] Uploaded details created`);
      })
      .catch((e) => {
        this._logger.error(`[${requestUUID}] Error while creating uploaded details: ${e.toString()}`, e.stack);

        throw e;
      });

    return uploadedDetails.map((_uploadedDetail) => _uploadedDetail.id);
  }

  /**
   * Delete file by id.
   * @param requestUUID
   * @param uploadedDetailId
   * @throws UPLOADED_DETAIL_NOT_FOUND
   */
  async deleteFile(requestUUID: string, uploadedDetailId: string): Promise<void> {
    const uploadedDetail = await this._uploadedDetailService.getUploadedDetailById(uploadedDetailId);

    this._logger.log(`[${requestUUID}] Uploaded detail is found: ${uploadedDetailId}`);

    await this._uploadedDetailService.deleteUploadedDetail(uploadedDetail);

    deleteFileIfExists(join(uploadedDetail.storagePath, uploadedDetail.filename));
  }
}
