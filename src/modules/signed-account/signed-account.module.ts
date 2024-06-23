import { Module } from '@nestjs/common';
import { SignedAccountService } from '../../services/signed-account/signed-account.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignedAccount } from '../../entities/signed-account';
import { CryptoService } from '../../services/crypto/crypto.service';
import { JwtService } from '../../services/jwt/jwt.service';

@Module({
  imports: [TypeOrmModule.forFeature([SignedAccount])],
  providers: [SignedAccountService, CryptoService, JwtService],
  exports: [SignedAccountService],
})
export class SignedAccountModule {}
