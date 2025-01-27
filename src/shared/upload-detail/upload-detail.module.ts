import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadDetail } from '../../entities/upload-detail';
import { UploadDetailService } from './upload-detail.service';

@Module({
  imports: [TypeOrmModule.forFeature([UploadDetail])],
  providers: [UploadDetailService],
  exports: [UploadDetailService],
})
export class UploadDetailModule {}
