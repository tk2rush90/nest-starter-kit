import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { MeApiController } from '../../controllers/me-api/me-api.controller';
import { MeApiService } from '../../services/me-api/me-api.service';
import { AuthGuard } from '../../guards/auth/auth.guard';
import { AuthApiModule } from '../auth-api/auth-api.module';

@Module({
  imports: [AccountModule, AuthApiModule],
  controllers: [MeApiController],
  providers: [MeApiService, AuthGuard],
})
export class MeApiModule {}
