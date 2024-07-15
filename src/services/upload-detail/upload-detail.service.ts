import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UploadDetail } from '../../entities/upload-detail';
import { Repository } from 'typeorm';
import { createWrapper, getOneWrapper } from '../../utils/typeorm';
import { UPLOADED_DETAIL_NOT_FOUND } from '../../constants/errors';

@Injectable()
export class UploadDetailService {
  constructor(@InjectRepository(UploadDetail) private readonly _uploadDetailRepository: Repository<UploadDetail>) {}

  /**
   * Create uploaded details for uploaded file.
   * @param file
   */
  async createUploadDetail(file: Express.Multer.File): Promise<UploadDetail> {
    return createWrapper(this._uploadDetailRepository, {
      filename: file.originalname,
      fileSize: file.size,
      mimetype: file.mimetype,
      storagePath: file.destination,
      createdAt: new Date(),
    });
  }

  /**
   * Get uploaded detail by id.
   * @param id
   * @throws UPLOADED_DETAIL_NOT_FOUND
   */
  async getUploadedDetailById(id: string): Promise<UploadDetail> {
    return getOneWrapper(
      this._uploadDetailRepository,
      {
        where: {
          id,
        },
      },
      UPLOADED_DETAIL_NOT_FOUND,
    );
  }

  /**
   * Delete uploaded detail.
   * @param uploadedDetail
   */
  async deleteUploadedDetail(uploadedDetail: UploadDetail): Promise<void> {
    await this._uploadDetailRepository.delete({
      id: uploadedDetail.id,
    });
  }
}
