import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UploadDetail } from '../../entities/upload-detail';
import { Repository } from 'typeorm';
import { createWrapper, deleteOneWrapper, getOneWrapper, getTargetRepository } from '../../utils/typeorm';
import { EntityManagerDto } from '../../dtos/entity-manager-dto';

@Injectable()
export class UploadDetailService {
  constructor(@InjectRepository(UploadDetail) private readonly repository: Repository<UploadDetail>) {}

  async create({
    fileSize,
    filename,
    storagePath,
    mimetype,
    entityManager,
  }: Pick<UploadDetail, 'fileSize' | 'filename' | 'storagePath' | 'mimetype'> &
    Partial<EntityManagerDto>): Promise<UploadDetail> {
    const repository = getTargetRepository(this.repository, entityManager);

    return createWrapper(repository, {
      filename,
      fileSize,
      mimetype,
      storagePath,
      createdAt: new Date(),
    });
  }

  async getOneById({ id }: Pick<UploadDetail, 'id'>): Promise<UploadDetail> {
    return getOneWrapper(this.repository, {
      where: {
        id,
      },
    });
  }

  async delete({ id }: Pick<UploadDetail, 'id'>): Promise<void> {
    await deleteOneWrapper(this.repository, {
      id,
    });
  }
}
