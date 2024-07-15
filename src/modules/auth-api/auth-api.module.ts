import { Module } from '@nestjs/common';
import { AuthApiController } from '../../controllers/auth-api/auth-api.controller';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [AccountModule],
  controllers: [AuthApiController],
})
export class AuthApiModule {}
