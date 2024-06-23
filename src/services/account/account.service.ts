import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from '../../entities/account';
import { EntityManager, Repository } from 'typeorm';
import { getRepository } from '../../utils/typeorm';
import { CryptoService } from '../crypto/crypto.service';
import { MINUTE, YEAR } from '../../constants/milliseconds';
import {
  ACCOUNT_NOT_FOUND,
  EXPIRED_OTP,
  INVALID_OTP,
  OTP_NOT_FOUND,
  SIGN_REQUIRED,
  UNEXPECTED_ERROR,
} from '../../constants/errors';
import { JwtService } from '../jwt/jwt.service';
import { AccountDto } from '../../dtos/account-dto';
import { ProfileDto } from '../../dtos/profile-dto';
import { File } from '../../entities/file';
import { configs } from '../../configs/configs';
import { SignedAccountService } from '../signed-account/signed-account.service';

/** A service that contains database related features for `Account` */
@Injectable()
export class AccountService {
  private readonly _logger = new Logger('AccountService');

  constructor(
    @InjectRepository(Account) private readonly _accountRepository: Repository<Account>,
    private readonly _jwtService: JwtService,
    private readonly _cryptoService: CryptoService,
    private readonly _signedAccountService: SignedAccountService,
  ) {}

  /**
   * Get duplicated status of `email` in `Account`.
   * @param email - Email to check.
   * @returns Returns duplicated status.
   */
  async isEmailDuplicated(email: string): Promise<boolean> {
    const accountCount = await this._accountRepository
      .count({
        where: {
          email,
        },
      })
      .catch((e) => {
        this._logger.error(`Failed to check email duplication '${email}': ${e.toString()}`, e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      });

    return accountCount > 0;
  }

  /**
   * Get duplicated status of `nickname` in `Account`.
   * @param nickname - Nickname to check.
   * @returns Returns duplicated status.
   */
  async isNicknameDuplicated(nickname: string): Promise<boolean> {
    const accountCount = await this._accountRepository
      .count({
        where: {
          nickname,
        },
      })
      .catch((e) => {
        this._logger.error(`Failed to check nickname duplication '${nickname}': ${e.toString()}`, e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      });

    return accountCount > 0;
  }

  /**
   * Get an `Account` by email.
   * It throws NotFoundException when there is no `Account`.
   * @param email - Email to find `Account`.
   * @returns Returns found `Account`.
   */
  async getAccountByEmail(email: string): Promise<Account> {
    // Find account.
    const account = await this._accountRepository
      .findOne({
        where: {
          email,
        },
      })
      .catch((e) => {
        this._logger.error(`Failed to get account by email '${email}': ${e.toString()}`, e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      });

    // When not found, throw exception.
    if (!account) {
      throw new NotFoundException(ACCOUNT_NOT_FOUND);
    }

    // Return.
    return account;
  }

  /**
   * Get an `Account` by access token.
   * @param accessToken - Access token to get `Account`.
   * @returns Returns `Account`.
   */
  async getAccountByAccessToken(accessToken: string): Promise<Account> {
    // Verify access token.
    const payload = await this._jwtService.verify(accessToken).catch((e) => {
      this._logger.error('Failed to verify access token: ' + e.toString(), e.stack);

      throw new UnauthorizedException(SIGN_REQUIRED);
    });

    // Get `Account` by email from verified token.
    return this.getAccountByEmail(payload.email);
  }

  /**
   * Get account by id.
   * When account not found, it throws exception.
   * @param id - Account id to get.
   * @returns Returns an `Account`.
   */
  async getAccountById(id: string): Promise<Account> {
    // Find account.
    const account = await this._accountRepository
      .findOne({
        where: {
          id,
        },
      })
      .catch((e) => {
        this._logger.error(`Failed to get account by id '${id}': ${e.toString()}`, e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      });

    // When not found, throw exception.
    if (!account) {
      throw new NotFoundException(ACCOUNT_NOT_FOUND);
    }

    // Return.
    return account;
  }

  /**
   * Create an `Account` entity.
   * Random `salt` for account is created, too.
   * @param email - Email of account.
   * @param nickname - Nickname of account.
   * @param entityManager - `EntityManager` when using transaction.
   * @returns Returns created `Account`.
   */
  async createAccount(email: string, nickname: string, entityManager?: EntityManager): Promise<Account> {
    // Get target repository.
    const accountRepository = getRepository(Account, this._accountRepository, entityManager);

    // Create random salt string.
    const salt = this._cryptoService.createSalt();

    // Create account.
    const account = accountRepository.create({
      email,
      nickname,
      salt,
      accountExpiredAt: new Date(Date.now() + YEAR),
    });

    // Save account.
    await accountRepository.save(account).catch((e) => {
      this._logger.error('Failed to save created account: ' + e.toString(), e.stack);

      throw new InternalServerErrorException(UNEXPECTED_ERROR);
    });

    // Return.
    return account;
  }

  /**
   * Save OTP to user account.
   * OTP will be expired after 3 minutes.
   * @param account - `Account` to save OTP.
   * @param otp - OTP which is required to sign in.
   * @param entityManager - `EntityManager` when using transaction.
   * @returns Returns expiry date.
   */
  async saveOtp(account: Account, otp: string, entityManager?: EntityManager): Promise<Date> {
    // Get target repository.
    const accountRepository = getRepository(Account, this._accountRepository, entityManager);

    // Create expiry date.
    const otpExpiredAt = new Date(Date.now() + MINUTE * 3);

    // Encrypt OTP.
    const encryptedOtp = this._cryptoService.encrypt(otp, account.salt);

    // Update `Account` with OTP and expiry date.
    await accountRepository
      .update(
        {
          id: account.id,
        },
        {
          otp: encryptedOtp,
          otpExpiredAt,
        },
      )
      .catch((e) => {
        this._logger.error('Failed to save OTP to account: ' + e.toString(), e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      });

    // Returns expiry date.
    return otpExpiredAt;
  }

  /**
   * Validate OTP.
   * @param account - `Account` to validate OTP.
   * @param otp - OTP.
   * @param entityManager - `EntityManager` when using transaction.
   */
  async validateOtp(account: Account, otp: string, entityManager?: EntityManager): Promise<void> {
    // Check OTP is issued for an `Account`.
    if (!account.otp || !account.otpExpiredAt) {
      throw new NotFoundException(OTP_NOT_FOUND);
    }

    // Encrypt OTP.
    const encryptedOtp = this._cryptoService.encrypt(otp, account.salt);

    // Check expiry date.
    if (new Date(account.otpExpiredAt).getTime() < Date.now()) {
      // When expired, remove OTP.
      await this.removeOtp(account, entityManager);

      throw new UnauthorizedException(EXPIRED_OTP);
    }

    // Check OTP.
    if (encryptedOtp !== account.otp) {
      throw new UnauthorizedException(INVALID_OTP);
    }

    // When validation passed, remove OTP.
    await this.removeOtp(account, entityManager);
  }

  /**
   * Remove OTP from `Account`.
   * @param account - `Account` to remove OTP.
   * @param entityManager - `EntityManager` when using transaction.
   */
  async removeOtp(account: Account, entityManager?: EntityManager): Promise<void> {
    // Get target repository.
    const accountRepository = getRepository(Account, this._accountRepository, entityManager);

    // Remove OTP and OTP expiry date.
    await accountRepository
      .update(
        {
          id: account.id,
        },
        {
          otp: null,
          otpExpiredAt: null,
        },
      )
      .catch((e) => {
        this._logger.error('Failed to remove OTP from account: ' + e.toString(), e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      });
  }

  /** Remove existing avatar url */
  async removeAvatarUrl(account: Account, entityManager?: EntityManager): Promise<void> {
    const accountRepository = getRepository(Account, this._accountRepository, entityManager);

    await accountRepository
      .update(
        {
          id: account.id,
        },
        {
          avatarUrl: null,
        },
      )
      .catch((e) => {
        this._logger.error('Failed to remove avatar url: ' + e.toString(), e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      });
  }

  /** Update avatar url by file */
  async updateAvatarUrl(account: Account, file: File, entityManager?: EntityManager): Promise<void> {
    const accountRepository = getRepository(Account, this._accountRepository, entityManager);

    await accountRepository
      .update(
        {
          id: account.id,
        },
        {
          avatarUrl: configs.urls.assets + `/${file.id}.${file.extension}`,
        },
      )
      .catch((e) => {
        this._logger.error('Failed to update avatar url: ' + e.toString(), e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      });
  }

  /**
   * Update account nickname.
   * @param account - Account to update.
   * @param nickname - Nickname to set.
   * @param entityManager - `EntityManager` when using transaction.
   */
  async updateNickname(account: Account, nickname: string, entityManager?: EntityManager): Promise<void> {
    // Get target repository.
    const accountRepository = getRepository(Account, this._accountRepository, entityManager);

    // Update nickname.
    await accountRepository
      .update(
        {
          id: account.id,
        },
        {
          nickname: nickname,
        },
      )
      .catch((e) => {
        this._logger.error('Failed to update account nickname: ' + e.toString(), e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      });
  }

  /**
   * Validate provided `accessToken`.
   * Validation will be done in 3 steps.
   * 1. Verify token.
   * 2. Check `Account` existence.
   * 3. Check `SignedAccount` existence with `Account` and `accessToken`.
   * When validation failed, it throws proper exceptions.
   * After all validations passed, updates expiry date of `SignedAccount`.
   * @param accessToken - Access token to validate.
   * @returns Returns validated account.
   */
  async validateAccessToken(accessToken: string): Promise<Account> {
    // Verify access token.
    const payload = await this._jwtService.verify(accessToken).catch((e) => {
      this._logger.error('Failed to verify access token: ' + e.toString(), e.stack);

      throw new UnauthorizedException(SIGN_REQUIRED);
    });

    // Get account.
    const account = await this.getAccountByEmail(payload.email);

    // Encrypt access token to find `SignedAccount`.
    const encryptedAccessToken = this._cryptoService.encrypt(accessToken, account.salt);

    // Find `SignedAccount`
    const signedAccount = await this._signedAccountService.getSignedAccount(account, encryptedAccessToken);

    // Update expiry date.
    await this._signedAccountService.updateExpiryDate(signedAccount);

    // Return account.
    return account;
  }

  /**
   * Delete account.
   * Files related with data will be deleted automatically by scheduler.
   * @param account - Account to delete.
   */
  async deleteAccount(account: Account): Promise<void> {
    // Delete account.
    await this._accountRepository
      .delete({
        id: account.id,
      })
      .catch((e) => {
        this._logger.error('Failed to delete account: ' + e.toString(), e.stack);

        throw new InternalServerErrorException(UNEXPECTED_ERROR);
      });
  }

  /**
   * Convert `Account` to `AccountDto`.
   * @param account - `Account` to convert.
   * @returns Returns `AccountDto`.
   */
  toAccountDto(account: Account): AccountDto {
    return new AccountDto({
      id: account.id,
      nickname: account.nickname,
    });
  }

  /**
   * Convert `Account` to `ProfileDto`.
   * @param account - `Account` to convert.
   * @param accessToken - Access token to set to `ProfileDto`.
   * @returns Returns `ProfileDto`.
   */
  toProfileDto(account: Account, accessToken: string): ProfileDto {
    // Create `ProfileDto` and return.
    return new ProfileDto({
      id: account.id,
      nickname: account.nickname,
      accessToken,
    });
  }
}
