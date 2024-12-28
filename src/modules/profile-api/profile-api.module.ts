import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { ProfileApiController } from '../../controllers/profile-api/profile-api.controller';
import { ProfileApiService } from '../../services/profile-api/profile-api.service';
import { AuthGuard } from '../../guards/auth/auth.guard';

@Module({
  imports: [AccountModule],
  controllers: [ProfileApiController],
  providers: [ProfileApiService, AuthGuard],
})
export class ProfileApiModule {}
