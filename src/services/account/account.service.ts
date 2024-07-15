import { ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from '../../entities/account';
import { EntityManager, Repository } from 'typeorm';
import { createWrapper, getOneWrapper, getTargetRepository } from '../../utils/typeorm';
import { MINUTE, YEAR } from '../../constants/milliseconds';
import {
  ACCOUNT_NOT_FOUND,
  DUPLICATED_EMAIL,
  DUPLICATED_NICKNAME,
  EXPIRED_OTP,
  INVALID_OTP,
  OTP_NOT_FOUND,
  SIGN_REQUIRED,
} from '../../constants/errors';
import { AccountDto } from '../../dtos/account-dto';
import { ProfileDto } from '../../dtos/profile-dto';
import { SignedAccountService } from '../signed-account/signed-account.service';
import { MailService } from '../mail/mail.service';
import { JoinDto } from '../../dtos/join-dto';
import { OtpExpiredAtDto } from '../../dtos/otp-expired-at-dto';
import { createOtp, createSalt, encrypt } from '../../utils/crypto';
import { verifyToken } from '../../utils/jwt';
import { LoginDto } from '../../dtos/login-dto';

/** A service that contains database related features for `Account` */
@Injectable()
export class AccountService {
  private readonly _logger = new Logger('AccountService');

  constructor(
    @InjectRepository(Account) private readonly _accountRepository: Repository<Account>,
    private readonly _entityManager: EntityManager,
    private readonly _mailService: MailService,
    private readonly _signedAccountService: SignedAccountService,
  ) {}

  /**
   * Check email duplicated.
   * When duplicated, throws DUPLICATED_EMAIL error.
   * @param requestUUID
   * @param email
   * @throws DUPLICATED_EMAIL
   */
  async checkEmailDuplicated(requestUUID: string, email: string): Promise<void> {
    // Check email duplication.
    if (await this.isEmailDuplicated(email)) {
      this._logger.error(`[${requestUUID}] Email is duplicated: ${email}`);

      throw new ConflictException(DUPLICATED_EMAIL);
    } else {
      this._logger.error(`[${requestUUID}] Email duplication checked: ${email}`);
    }
  }

  /**
   * Check nickname duplicated.
   * When duplicated, throws DUPLICATED_NICKNAME error.
   * @param requestUUID
   * @param nickname
   * @throws DUPLICATED_NICKNAME
   */
  async checkNicknameDuplicated(requestUUID: string, nickname: string): Promise<void> {
    // Check nickname duplication.
    if (await this.isNicknameDuplicated(nickname)) {
      this._logger.error(`[${requestUUID}] Nickname is duplicated: ${nickname}`);

      throw new ConflictException(DUPLICATED_NICKNAME);
    } else {
      this._logger.error(`[${requestUUID}] Nickname duplication checked: ${nickname}`);
    }
  }

  /**
   * Create account to join.
   * @param requestUUID
   * @param email
   * @param nickname
   * @throws DUPLICATED_EMAIL
   * @throws DUPLICATED_NICKNAME
   * @throws METHOD_NOT_IMPLEMENTED
   */
  async join(requestUUID: string, { email, nickname }: JoinDto): Promise<AccountDto> {
    await this.checkEmailDuplicated(requestUUID, email);

    await this.checkNicknameDuplicated(requestUUID, nickname);

    return this._entityManager
      .transaction(async (_entityManager) => {
        const account = await this.createAccount(email, nickname, _entityManager);

        this._logger.log(`[${requestUUID}] Account is created: ${account.id}`);

        await this._mailService.sendMail(email, '계정이 생성 되었습니다', 'welcome.html', {
          nickname,
        });

        this._logger.log(`[${requestUUID}] Welcome email is sent: ${email}`);

        return this.toAccountDto(account);
      })
      .catch((e) => {
        this._logger.error(`[${requestUUID}] Error while joining: ${e}`, e.stack);

        throw e;
      });
  }

  /**
   * Send OTP to email.
   * @param requestUUID
   * @param email
   * @throws ACCOUNT_NOT_FOUND
   * @throws
   */
  async sendOtp(requestUUID: string, email: string): Promise<OtpExpiredAtDto> {
    // Get account.
    const account = await this.getAccountByEmail(email);

    this._logger.log(`[${requestUUID}] Account is found by email: ${email}`);

    // Create OTP.
    const otp = createOtp();

    this._logger.log(`[${requestUUID}]: OTP is created`);

    // Start transaction to send OTP.
    // When email sending is failed, saved OTP will be removed.
    return this._entityManager
      .transaction(async (_entityManager) => {
        // Save OTP and get expiry date.
        const otpExpiredAt = await this.saveOtp(account, otp, _entityManager);

        this._logger.log(`[${requestUUID}]: OTP is saved`);

        await this._mailService.sendMail(email, 'OTP가 발급 되었습니다', 'otp.html', {
          nickname: account.nickname,
          otp,
        });

        this._logger.log(`[${requestUUID}]: OTP created email is sent: ${email}`);

        // Create DTO and return.
        return new OtpExpiredAtDto({
          otpExpiredAt,
        });
      })
      .catch((e) => {
        this._logger.error(`[${requestUUID}] Error while sending Otp email: ${e}`, e.stack);

        throw e;
      });
  }

  /**
   * Default login process.
   * @param requestUUID
   * @param email
   * @param otp
   * @throws ACCOUNT_NOT_FOUND
   * @throws OTP_NOT_FOUND
   * @throws EXPIRED_OTP
   * @throws INVALID_OTP
   */
  async login(requestUUID: string, { email, otp }: LoginDto): Promise<ProfileDto> {
    // Get account.
    const account = await this.getAccountByEmail(email);

    this._logger.log(`[${requestUUID}] Account is found by email: ${email}`);

    // Mark `Account` as signed and return `ProfileDto`.
    return this._entityManager
      .transaction(async (_entityManager) => {
        // Validate OTP.
        await this.validateOtp(account, otp, _entityManager);

        this._logger.log(`[${requestUUID}] OTP is validated`);

        // Mark `Account` as signed.
        const accessToken = await this._signedAccountService.markAccountAsSigned(account, _entityManager);

        this._logger.log(`[${requestUUID}] Account is marked as signed`);

        // Convert and return.
        return this.toProfileDto(account, accessToken);
      })
      .catch((e) => {
        this._logger.error(`[${requestUUID}] Error while logging in: ${e}`, e.stack);

        throw e;
      });
  }

  /**
   * Auto login process with token.
   * @param requestUUID
   * @param accessToken
   * @throws SIGN_REQUIRED
   * @throws ACCOUNT_NOT_FOUND
   */
  async autoLogin(requestUUID: string, accessToken: string): Promise<ProfileDto | void> {
    if (accessToken) {
      // Validate and get account.
      const account = await this.validateAccessToken(accessToken);

      this._logger.log(`[${requestUUID}] Access token is validated: ${account.id}`);

      // Convert and return.
      return this.toProfileDto(account, accessToken);
    } else {
      this._logger.error(`[${requestUUID}] Access token isn't provided`);

      throw new UnauthorizedException(SIGN_REQUIRED);
    }
  }

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
   * @returns Returns `Account`.
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
   * @returns Returns an `Account`.
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
   * @param entityManager - `EntityManager` when using transaction.
   * @returns Returns created `Account`.
   */
  async createAccount(email: string, nickname: string, entityManager?: EntityManager): Promise<Account> {
    // Get target repository.
    const accountRepository = getTargetRepository(this._accountRepository, entityManager);

    // Create random salt string.
    const salt = createSalt();

    return createWrapper(accountRepository, {
      email,
      nickname,
      salt,
      accountExpiredAt: new Date(Date.now() + YEAR),
      createdAt: new Date(),
    });
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
   * @returns Returns validated account.
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
   */
  async deleteAccount(account: Account): Promise<void> {
    // Delete account.
    await this._accountRepository.delete({
      id: account.id,
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
