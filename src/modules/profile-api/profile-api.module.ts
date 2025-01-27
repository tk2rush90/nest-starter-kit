import { Module } from '@nestjs/common';
import { AccountModule } from '../../shared/account/account.module';
import { ProfileApiController } from './profile-api.controller';
import { ProfileApiService } from './profile-api.service';
import { AuthGuard } from '../../guards/auth/auth.guard';

@Module({
  imports: [AccountModule],
  controllers: [ProfileApiController],
  providers: [ProfileApiService, AuthGuard],
})
export class ProfileApiModule {}
