import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from '../../entities/account';
import { EntityManager, Repository } from 'typeorm';
import { createWrapper, getOneWrapper, getTargetRepository } from '../../utils/typeorm';
import { MINUTE, YEAR } from '../../constants/milliseconds';
import { ACCOUNT_NOT_FOUND, EXPIRED_OTP, INVALID_OTP, OTP_NOT_FOUND, SIGN_REQUIRED } from '../../constants/errors';
import { AccountDto } from '../../dtos/account-dto';
import { ProfileDto } from '../../dtos/profile-dto';
import { SignedAccountService } from '../signed-account/signed-account.service';
import { createSalt, encrypt } from '../../utils/crypto';
import { verifyToken } from '../../utils/jwt';
import { OauthProvider } from '../../types/oauth-provider';
import { DeletedAccountDto } from '../../dtos/deleted-account-dto';
import { AccountJsonDto } from '../../dtos/account-json-dto';

/** A service that contains database related features for `Account` */
@Injectable()
export class AccountService {
  private readonly _logger = new Logger('AccountService');

  constructor(
    @InjectRepository(Account) private readonly _accountRepository: Repository<Account>,
    private readonly _signedAccountService: SignedAccountService,
  ) {}

  /**
   * Get duplicated status of email.
   * @param email
   */
  async isEmailDuplicated(email: string): Promise<boolean> {
    const accountCount = await this._accountRepository.count({
      where: {
        email,
      },
    });

    return accountCount > 0;
  }

  /**
   * Get duplicated status of nickname.
   * @param nickname
   */
  async isNicknameDuplicated(nickname: string): Promise<boolean> {
    const accountCount = await this._accountRepository.count({
      where: {
        nickname,
      },
    });

    return accountCount > 0;
  }

  /**
   * Get an account by email.
   * @param email
   * @throws ACCOUNT_NOT_FOUND
   */
  async getAccountByEmail(email: string): Promise<Account> {
    return getOneWrapper(
      this._accountRepository,
      {
        where: {
          email,
        },
      },
      ACCOUNT_NOT_FOUND,
    );
  }

  /**
   * Get an `Account` by access token.
   * @param accessToken - Access token to get `Account`.
   */
  async getAccountByAccessToken(accessToken: string): Promise<Account> {
    // Verify access token.
    const payload = await verifyToken(accessToken).catch((e) => {
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
   */
  async getAccountById(id: string): Promise<Account> {
    // Find account.
    const account = await this._accountRepository.findOne({
      where: {
        id,
      },
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
   * @param oauthProvider
   * @param oauthId
   * @param entityManager - `EntityManager` when using transaction.
   */
  async createAccount(
    email: string,
    nickname: string,
    oauthProvider?: OauthProvider,
    oauthId?: string,
    entityManager?: EntityManager,
  ): Promise<Account> {
    // Get target repository.
    const accountRepository = getTargetRepository(this._accountRepository, entityManager);

    // Create random salt string.
    const salt = createSalt();

    return createWrapper(accountRepository, {
      email,
      nickname,
      salt,
      oauthProvider,
      oauthId,
      accountExpiredAt: new Date(Date.now() + YEAR),
      createdAt: new Date(),
    });
  }

  /**
   * Update account avatar id.
   * @param account
   * @param avatarId
   * @param entityManager
   */
  async updateAccountAvatarId(account: Account, avatarId: string | null, entityManager?: EntityManager): Promise<void> {
    const accountRepository = getTargetRepository(this._accountRepository, entityManager);

    await accountRepository.update(
      {
        id: account.id,
      },
      {
        avatarId,
      },
    );
  }

  /**
   * Update account nickname.
   * It doesn't validate nickname duplication.
   * @param account
   * @param nickname
   * @param entityManager
   */
  async updateAccountNickname(account: Account, nickname: string, entityManager?: EntityManager): Promise<void> {
    const accountRepository = getTargetRepository(this._accountRepository, entityManager);

    await accountRepository.update(
      {
        id: account.id,
      },
      {
        nickname,
      },
    );
  }

  /**
   * Save OTP to user account.
   * OTP will be expired after 3 minutes.
   * @param account - `Account` to save OTP.
   * @param otp - OTP which is required to sign in.
   * @param entityManager - `EntityManager` when using transaction.
   */
  async saveOtp(account: Account, otp: string, entityManager?: EntityManager): Promise<Date> {
    // Get target repository.
    const accountRepository = getTargetRepository(this._accountRepository, entityManager);

    // Create expiry date.
    const otpExpiredAt = new Date(Date.now() + MINUTE * 3);

    // Encrypt OTP.
    const encryptedOtp = encrypt(otp, account.salt);

    // Update `Account` with OTP and expiry date.
    await accountRepository.update(
      {
        id: account.id,
      },
      {
        otp: encryptedOtp,
        otpExpiredAt,
      },
    );

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
    const encryptedOtp = encrypt(otp, account.salt);

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
    const accountRepository = getTargetRepository(this._accountRepository, entityManager);

    // Remove OTP and OTP expiry date.
    await accountRepository.update(
      {
        id: account.id,
      },
      {
        otp: null,
        otpExpiredAt: null,
      },
    );
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
   */
  async validateAccessToken(accessToken: string): Promise<Account> {
    const account = await this.getAccountByAccessToken(accessToken);

    // Encrypt access token to find `SignedAccount`.
    const encryptedAccessToken = encrypt(accessToken, account.salt);

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
   * @param entityManager
   */
  async deleteAccount(account: Account, entityManager?: EntityManager): Promise<void> {
    const accountRepository = getTargetRepository(this._accountRepository, entityManager);

    // Delete account.
    await accountRepository.delete({
      id: account.id,
    });
  }

  /**
   * Find an account with oauth.
   * @param oauthProvider
   * @param oauthId
   */
  async findAccountByOauth(oauthProvider: OauthProvider, oauthId: string): Promise<Account | null> {
    return this._accountRepository.findOne({
      where: {
        oauthProvider,
        oauthId,
      },
    });
  }

  /**
   * Get an account with oauth.
   * @param oauthProvider
   * @param oauthId
   * @throws ACCOUNT_NOT_FOUND
   */
  async getAccountByOauth(oauthProvider: OauthProvider, oauthId: string): Promise<Account> {
    return getOneWrapper(
      this._accountRepository,
      {
        where: {
          oauthProvider,
          oauthId,
        },
      },
      ACCOUNT_NOT_FOUND,
    );
  }

  /**
   * Convert `Account` to `AccountDto`.
   * @param account - `Account` to convert.
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
   */
  toProfileDto(account: Account, accessToken: string): ProfileDto {
    // Create `ProfileDto` and return.
    return new ProfileDto({
      id: account.id,
      avatarId: account.avatarId,
      nickname: account.nickname,
      accessToken,
    });
  }

  /**
   * To deleted account.
   * @param account
   */
  toDeletedAccountDto(account: Account): DeletedAccountDto {
    return new DeletedAccountDto({
      ...this.toAccountDto(account),
      email: account.email,
      oauthProvider: account.oauthProvider,
      oauthId: account.oauthId,
    });
  }

  /**
   * To account json dto.
   * @param account
   */
  toAccountJsonDto(account: Account): AccountJsonDto {
    return new AccountJsonDto({
      id: account.id,
      salt: account.salt,
      email: account.email,
      nickname: account.nickname,
      otp: account.otp,
      otpExpiredAt: account.otpExpiredAt,
      avatarId: account.avatarId,
      oauthProvider: account.oauthProvider,
      oauthId: account.oauthId,
      accountExpiredAt: account.accountExpiredAt,
      createdAt: account.createdAt,
    });
  }
}
