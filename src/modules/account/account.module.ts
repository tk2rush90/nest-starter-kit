import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../../entities/account';
import { AccountService } from '../../services/account/account.service';
import { CryptoService } from '../../services/crypto/crypto.service';
import { JwtService } from '../../services/jwt/jwt.service';
import { SignedAccountModule } from '../signed-account/signed-account.module';

@Module({
  imports: [TypeOrmModule.forFeature([Account]), forwardRef(() => SignedAccountModule)],
  providers: [AccountService, CryptoService, JwtService],
  exports: [AccountService],
})
export class AccountModule {}
