import { Module } from '@nestjs/common';
import { CryptoService } from '../../services/crypto/crypto.service';
import { FileService } from '../../services/file/file.service';

@Module({
  providers: [CryptoService, FileService],
  exports: [FileService],
})
export class FileModule {}
