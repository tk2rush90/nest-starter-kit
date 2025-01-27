import { Injectable, StreamableFile } from '@nestjs/common';
import { UploadDetailService } from '../../shared/upload-detail/upload-detail.service';
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
  constructor(
    private readonly entityManager: EntityManager,
    private readonly uploadedDetailService: UploadDetailService,
  ) {}

  async getFileStream(request: Request, response: Response, uploadedDetailId: string): Promise<StreamableFile> {
    const uploadedDetail = await this.uploadedDetailService.getOneById({
      id: uploadedDetailId,
    });

    const filePath = join(uploadedDetail.storagePath, uploadedDetail.filename);
    const fileSize = toInteger(uploadedDetail.fileSize);

    response.setHeader('Content-Length', fileSize);
    response.setHeader('Content-Type', uploadedDetail.mimetype);

    if (uploadedDetail.mimetype.startsWith('video') && request.headers.range) {
      const parts = request.headers.range.replace(/bytes=/, '').split('-');

      const start = parseInt(parts[0], 10);

      const end = parts[1] ? parseInt(parts[1], 10) : undefined;

      const readStream = createReadStream(filePath, { start, end });

      const contentRange = `bytes ${start}-${end || (readStream.bytesRead || fileSize) - 1}/${readStream.bytesRead || fileSize}`;

      response.status(206); // Partial Content
      response.setHeader('Content-Range', contentRange);
      response.setHeader('Accept-Ranges', 'bytes');
      response.setHeader('Cache-Control', 'max-age=3153600');

      return new StreamableFile(readStream);
    } else {
      response.setHeader('Cache-Control', 'max-age=3153600');

      return new StreamableFile(readFileSync(filePath));
    }
  }

  /**
   * 업로드 된 파일에 대한 `UploadDetail` 엔티티 생성. 업로드 처리 완료 후 파일 접근 경로를 배열 형태로 리턴
   * @param files
   * @param body
   */
  async uploadFiles(files: Express.Multer.File[], body: UploadFilesDto): Promise<string[]> {
    const uploadedDetails: UploadDetail[] = [];

    await this.entityManager.transaction(async (entityManager) => {
      for (const _file of files) {
        _file.destination = configs.paths.files; // 업로드 경로 설정
        _file.filename = createUUID() + extname(_file.originalname); // 최초 기존 확장자 유지

        if (body.width) {
          if (_file.mimetype === 'image/gif') {
            // Gif 처리
            _file.buffer = await resizeGif(_file.buffer, body.width);
          } else if (_file.mimetype !== 'image/svg+xml' && _file.mimetype.startsWith('image')) {
            // Gif, svg 가 아닌 이미지 처리
            // 이미지를 webp 형식으로 변경 후 저장
            _file.filename = createUUID() + basename(_file.originalname, extname(_file.originalname)) + '.webp'; // 확장자 변경
            _file.buffer = await resizeToWebP(_file.buffer, body.width);
            _file.mimetype = 'image/webp';
          }
        }

        // 업로드 할 경로 생성
        const filePath = join(_file.destination, _file.filename);

        createFile(filePath, _file.buffer);

        _file.size = getFileSize(filePath);

        uploadedDetails.push(
          await this.uploadedDetailService.create({
            fileSize: _file.size,
            filename: _file.filename,
            storagePath: _file.destination,
            mimetype: _file.mimetype,
            entityManager,
          }),
        );
      }
    });

    return uploadedDetails.map(
      (_uploadedDetail) => configs.urls.host + '/' + _uploadedDetail.id + extname(_uploadedDetail.filename),
    );
  }

  async deleteFile(id: string): Promise<void> {
    const uploadedDetail = await this.uploadedDetailService.getOneById({
      id,
    });

    await this.uploadedDetailService.delete({
      id: uploadedDetail.id,
    });

    deleteFileIfExists(join(uploadedDetail.storagePath, uploadedDetail.filename));
  }
}
