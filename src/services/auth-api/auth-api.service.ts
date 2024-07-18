import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import {
  DUPLICATED_EMAIL,
  DUPLICATED_NICKNAME,
  JOINED_ACCOUNT,
  NOT_VERIFIED_GOOGLE_ACCOUNT,
  SIGN_REQUIRED,
} from '../../constants/errors';
import { JoinDto } from '../../dtos/join-dto';
import { AccountDto } from '../../dtos/account-dto';
import { OtpExpiredAtDto } from '../../dtos/otp-expired-at-dto';
import { createOtp, encrypt } from '../../utils/crypto';
import { LoginDto } from '../../dtos/login-dto';
import { ProfileDto } from '../../dtos/profile-dto';
import { AccountService } from '../account/account.service';
import { SignedAccountService } from '../signed-account/signed-account.service';
import { EntityManager } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { GoogleIdTokenDto } from '../../dtos/google-id-token-dto';
import { OauthService } from '../oauth/oauth.service';
import { Account } from '../../entities/account';
import { OauthProvider } from '../../types/oauth-provider';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthApiService {
  private readonly _logger = new Logger('AuthApiService');

  constructor(
    private readonly _entityManager: EntityManager,
    private readonly _mailService: MailService,
    private readonly _oauthService: OauthService,
    private readonly _accountService: AccountService,
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
    if (await this._accountService.isEmailDuplicated(email)) {
      this._logger.error(`[${requestUUID}] Email is duplicated: ${email}`);

      throw new ConflictException(DUPLICATED_EMAIL);
    } else {
      this._logger.log(`[${requestUUID}] Email duplication checked: ${email}`);
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
    if (await this._accountService.isNicknameDuplicated(nickname)) {
      this._logger.error(`[${requestUUID}] Nickname is duplicated: ${nickname}`);

      throw new ConflictException(DUPLICATED_NICKNAME);
    } else {
      this._logger.log(`[${requestUUID}] Nickname duplication checked: ${nickname}`);
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
    const account = await this._createNewAccount(requestUUID, email, nickname);

    return this._accountService.toAccountDto(account);
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
    const account = await this._accountService.getAccountByEmail(email);

    this._logger.log(`[${requestUUID}] Account is found by email: ${email}`);

    // Create OTP.
    const otp = createOtp();

    this._logger.log(`[${requestUUID}]: OTP is created`);

    // Start transaction to send OTP.
    // When email sending is failed, saved OTP will be removed.
    return this._entityManager
      .transaction(async (_entityManager) => {
        // Save OTP and get expiry date.
        const otpExpiredAt = await this._accountService.saveOtp(account, otp, _entityManager);

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
        this._logger.error(`[${requestUUID}] Error while sending Otp email: ${e.toString()}`, e.stack);

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
    const account = await this._accountService.getAccountByEmail(email);

    this._logger.log(`[${requestUUID}] Account is found by email: ${email}`);

    // Mark `Account` as signed and return `ProfileDto`.
    return this._entityManager
      .transaction(async (_entityManager) => {
        // Validate OTP.
        await this._accountService.validateOtp(account, otp, _entityManager);

        this._logger.log(`[${requestUUID}] OTP is validated`);

        // Mark `Account` as signed.
        const accessToken = await this._signedAccountService.markAccountAsSigned(account, _entityManager);

        this._logger.log(`[${requestUUID}] Account is marked as signed`);

        // Convert and return.
        return this._accountService.toProfileDto(account, accessToken);
      })
      .catch((e) => {
        this._logger.error(`[${requestUUID}] Error while logging in: ${e.toString()}`, e.stack);

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
      const account = await this._accountService.validateAccessToken(accessToken);

      this._logger.log(`[${requestUUID}] Access token is validated: ${account.id}`);

      // Convert and return.
      return this._accountService.toProfileDto(account, accessToken);
    } else {
      this._logger.error(`[${requestUUID}] Access token isn't provided`);

      throw new UnauthorizedException(SIGN_REQUIRED);
    }
  }

  /**
   * Logout.
   * @param requestUUID
   * @param accessToken
   * @throws SIGN_REQUIRED
   * @throws ACCOUNT_NOT_FOUND
   */
  async logout(requestUUID: string, accessToken: string): Promise<void> {
    try {
      const account = await this._accountService.validateAccessToken(accessToken);

      this._logger.log(`[${requestUUID}] Access token is validated: ${account.id}`);

      const encryptedAccessToken = encrypt(accessToken, account.salt);

      this._logger.log(`[${requestUUID}] Access token is encrypted`);

      const signedAccount = await this._signedAccountService.getSignedAccount(account, encryptedAccessToken);

      this._logger.log(`[${requestUUID}] Signed account found`);

      await this._signedAccountService.deleteSignedAccount(signedAccount);

      this._logger.log(`[${requestUUID}] Signed account deleted`);
    } catch (e) {
      // Don't throw exception to process logout from the client.
      this._logger.error(`[${requestUUID}] Error while logging out: ${e.toString()}`, e.stack);
    }
  }

  /**
   * Join by google.
   * @param requestUUID
   * @param nickname
   * @param idToken
   * @throws JOINED_ACCOUNT
   * @throws DUPLICATED_EMAIL
   * @throws DUPLICATED_NICKNAME
   */
  async joinByGoogle(requestUUID: string, { idToken }: GoogleIdTokenDto): Promise<AccountDto> {
    const tokenPayload = await this._oauthService.verifyGoogleIdToken(idToken);

    if (!tokenPayload.email_verified) {
      this._logger.error('Google email is not verified');

      throw new BadRequestException(NOT_VERIFIED_GOOGLE_ACCOUNT);
    }

    const existingAccount = await this._accountService.findAccountByOauth('google', tokenPayload.sub);

    if (existingAccount) {
      this._logger.error('Account is duplicated with Google');

      throw new ConflictException(JOINED_ACCOUNT);
    }

    const nickname =
      tokenPayload.name.replace(/\s/gm, '').substring(0, 8) + randomUUID().split('-').pop().substring(0, 5);

    this._logger.log(`[${requestUUID}] Random nickname is created: ${nickname}`);

    const account = await this._createNewAccount(requestUUID, tokenPayload.email, nickname, 'google', tokenPayload.sub);

    return this._accountService.toAccountDto(account);
  }

  /**
   * Login by google.
   * @param requestUUID
   * @param idToken
   * @throws ACCOUNT_NOT_FOUND
   */
  async loginByGoogle(requestUUID: string, { idToken }: GoogleIdTokenDto): Promise<ProfileDto> {
    const tokenPayload = await this._oauthService.verifyGoogleIdToken(idToken);

    const account = await this._accountService.getAccountByOauth('google', tokenPayload.sub);

    this._logger.log(`[${requestUUID}] Account is found by google: ${account.id}`);

    // Mark `Account` as signed.
    const accessToken = await this._signedAccountService.markAccountAsSigned(account);

    this._logger.log(`[${requestUUID}] Account is marked as signed`);

    // Convert and return.
    return this._accountService.toProfileDto(account, accessToken);
  }

  /**
   * Create a new account.
   * @param requestUUID
   * @param email
   * @param nickname
   * @param oauthProvider
   * @param oauthId
   * @throws DUPLICATED_EMAIL
   * @throws DUPLICATED_NICKNAME
   */
  private async _createNewAccount(
    requestUUID: string,
    email: string,
    nickname: string,
    oauthProvider?: OauthProvider,
    oauthId?: string,
  ): Promise<Account> {
    await this.checkEmailDuplicated(requestUUID, email);

    await this.checkNicknameDuplicated(requestUUID, nickname);

    return this._entityManager
      .transaction(async (_entityManager) => {
        const account = await this._accountService.createAccount(
          email,
          nickname,
          oauthProvider,
          oauthId,
          _entityManager,
        );

        this._logger.log(`[${requestUUID}] Account is created: ${account.id}`);

        await this._mailService.sendMail(email, '계정이 생성 되었습니다', 'welcome.html', {
          nickname,
        });

        this._logger.log(`[${requestUUID}] Welcome email is sent: ${email}`);

        return account;
      })
      .catch((e) => {
        this._logger.error(`[${requestUUID}] Error while joining: ${e.toString()}`, e.stack);

        throw e;
      });
  }
}
