import { pbkdf2Sync, randomBytes, randomUUID } from 'crypto';

/** Create OTP string with `randomBytes()` function */
export function createOtp(): string {
  return randomBytes(5).toString('hex').toUpperCase();
}

/** Create random UUID */
export function createUUID(): string {
  return randomUUID({
    disableEntropyCache: true,
  });
}

/** Create random salt string */
export function createSalt(): string {
  return randomBytes(64).toString('hex');
}

/**
 * Encrypt `value` with `salt`.
 * It's 1-way encryption.
 * @param value - Value to encrypt.
 * @param salt - Random salt string.
 */
export function encrypt(value: string, salt: string): string {
  return pbkdf2Sync(value, salt, 10000, 64, 'sha512').toString('hex');
}
