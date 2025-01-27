import { Module } from '@nestjs/common';
import { FileApiController } from './file-api.controller';
import { UploadDetailModule } from '../../shared/upload-detail/upload-detail.module';
import { AccountModule } from '../../shared/account/account.module';
import { AuthGuard } from '../../guards/auth/auth.guard';
import { FileApiService } from './file-api.service';

@Module({
  imports: [UploadDetailModule, AccountModule],
  controllers: [FileApiController],
  providers: [AuthGuard, FileApiService],
})
export class FileApiModule {}
