import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { pbkdf2Sync, randomBytes, randomUUID } from 'crypto';
import { UNEXPECTED_ERROR } from '../../constants/errors';

/** A service that contains `crypto` package's feature */
@Injectable()
export class CryptoService {
  private readonly _logger = new Logger('CryptoService');

  /**
   * Create OTP string with `randomBytes()` function.
   * @returns Returns created OTP.
   */
  createOtp(): string {
    try {
      return randomBytes(5).toString('hex').toUpperCase();
    } catch (e) {
      this._logger.error('Failed to create random salt string: ' + e.toString(), e.stack);

      throw new InternalServerErrorException(UNEXPECTED_ERROR);
    }
  }

  /**
   * Create random UUID.
   * @returns Returns created random UUID.
   */
  createUUID(): string {
    return randomUUID({
      disableEntropyCache: true,
    });
  }

  /**
   * Create random salt string.
   * @returns Returns random salt string.
   */
  createSalt(): string {
    try {
      return randomBytes(64).toString('hex');
    } catch (e) {
      this._logger.error('Failed to create random salt string: ' + e.toString(), e.stack);

      throw new InternalServerErrorException(UNEXPECTED_ERROR);
    }
  }

  /**
   * Encrypt `value` with `salt`.
   * It's 1-way encryption.
   * @param value - Value to encrypt.
   * @param salt - Random salt string.
   * @returns Returns encrypted string.
   */
  encrypt(value: string, salt: string): string {
    try {
      return pbkdf2Sync(value, salt, 10000, 64, 'sha512').toString('hex');
    } catch (e) {
      this._logger.error(`Failed to encrypt value '${value}': ` + e.toString(), e.stack);

      throw new InternalServerErrorException(UNEXPECTED_ERROR);
    }
  }
}
