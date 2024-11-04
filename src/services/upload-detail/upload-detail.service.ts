import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UploadDetail } from '../../entities/upload-detail';
import { Repository } from 'typeorm';
import { createWrapper, getOneWrapper, getTargetRepository } from '../../utils/typeorm';
import { EntityManagerDto } from '../../dtos/entity-manager-dto';

@Injectable()
export class UploadDetailService {
  constructor(@InjectRepository(UploadDetail) private readonly _repository: Repository<UploadDetail>) {}

  async create({
    file,
    entityManager,
  }: { file: Express.Multer.File } & Partial<EntityManagerDto>): Promise<UploadDetail> {
    const repository = getTargetRepository(this._repository, entityManager);

    return createWrapper(repository, {
      filename: file.filename,
      fileSize: file.size,
      mimetype: file.mimetype,
      storagePath: file.destination,
      createdAt: new Date(),
    });
  }

  async getOneById({ id }: Pick<UploadDetail, 'id'>): Promise<UploadDetail> {
    return getOneWrapper(this._repository, {
      where: {
        id,
      },
    });
  }

  async delete({ id }: Pick<UploadDetail, 'id'>): Promise<void> {
    await this._repository.delete({
      id,
    });
  }
}
