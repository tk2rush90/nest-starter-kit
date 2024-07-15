import { Module } from '@nestjs/common';
import { FileApiController } from '../../controllers/file-api/file-api.controller';
import { UploadDetailModule } from '../upload-detail/upload-detail.module';
import { AccountModule } from '../account/account.module';
import { AuthGuard } from '../../guards/auth/auth.guard';
import { FileApiService } from '../../services/file-api/file-api.service';

@Module({
  imports: [UploadDetailModule, AccountModule],
  controllers: [FileApiController],
  providers: [AuthGuard, FileApiService],
})
export class FileApiModule {}
