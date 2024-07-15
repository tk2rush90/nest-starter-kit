import { Module } from '@nestjs/common';
import { FileApiController } from '../../controllers/file-api/file-api.controller';
import { UploadDetailModule } from '../upload-detail/upload-detail.module';
import { AccountModule } from '../account/account.module';
import { AuthGuard } from '../../guards/auth/auth.guard';

@Module({
  imports: [UploadDetailModule, AccountModule],
  controllers: [FileApiController],
  providers: [AuthGuard],
})
export class FileApiModule {}
