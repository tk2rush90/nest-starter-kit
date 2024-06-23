import {
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Logger,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { MailService } from '../../services/mail/mail.service';
import { AccountService } from '../../services/account/account.service';
import { SignUpDto } from '../../dtos/sign-up-dto';
import { EntityManager } from 'typeorm';
import { CryptoService } from '../../services/crypto/crypto.service';
import { DUPLICATED_EMAIL, DUPLICATED_NICKNAME, SIGN_REQUIRED } from '../../constants/errors';
import { EmailDto } from '../../dtos/email-dto';
import { NicknameDto } from '../../dtos/nickname-dto';
import { OtpExpiredAtDto } from '../../dtos/otp-expired-at-dto';
import { SignInDto } from '../../dtos/sign-in-dto';
import { ProfileDto } from '../../dtos/profile-dto';
import { AccountDto } from '../../dtos/account-dto';
import { AuthGuard } from '../../guards/auth/auth.guard';
import { Request } from 'express';

/** A controller that contains endpoint related with authentication */
@Controller('auth')
export class AuthApiController {
  private readonly _logger = new Logger('AuthApiController');

  constructor(
    private readonly _entityManager: EntityManager,
    private readonly _mailService: MailService,
    private readonly _accountService: AccountService,
    private readonly _cryptoService: CryptoService,
  ) {}

  /**
   * Check email duplication.
   * When email duplicated, it throws exception.
   * @param emailDto - Request query to check email duplication.
   */
  @Get('check/email')
  async checkEmail(@Query() emailDto: EmailDto): Promise<void> {
    // Check email duplication.
    if (await this._accountService.isEmailDuplicated(emailDto.email)) {
      throw new ConflictException(DUPLICATED_EMAIL);
    }
  }

  /**
   * Check nickname duplication.
   * When nickname duplicated, it throws exception.
   * @param nicknameDto - Request query to check nickname duplication.
   */
  @Get('check/nickname')
  async checkNickname(@Query() nicknameDto: NicknameDto): Promise<void> {
    // Check nickname duplication.
    if (await this._accountService.isNicknameDuplicated(nicknameDto.nickname)) {
      throw new ConflictException(DUPLICATED_NICKNAME);
    }
  }

  /**
   * Sign up to create new `Account`.
   * @param signUpDto - Request body to sign up.
   */
  @Post('sign/up')
  async signUp(@Body() signUpDto: SignUpDto): Promise<AccountDto> {
    // Check email duplication.
    if (await this._accountService.isEmailDuplicated(signUpDto.email)) {
      throw new ConflictException(DUPLICATED_EMAIL);
    }

    // Check nickname duplication.
    if (await this._accountService.isNicknameDuplicated(signUpDto.nickname)) {
      throw new ConflictException(DUPLICATED_NICKNAME);
    }

    // Start transaction to create `Account` and send welcome email.
    // When email sending is failed, created `Account` will be rollback.
    return this._entityManager.transaction(async (_entityManager) => {
      // Create `Account`.
      const account = await this._accountService.createAccount(signUpDto.email, signUpDto.nickname, _entityManager);

      // Send welcome email.
      await this._sendWelcomeEmail(signUpDto.email, signUpDto.nickname);

      // Convert and return.
      return this._accountService.toAccountDto(account);
    });
  }

  /** Send welcome email */
  private _sendWelcomeEmail(email: string, nickname: string): Promise<void> {
    throw new Error('Method is not implemented');
  }

  /**
   * Send OTP mail to email which has `Account` for platform.
   * @param request - Request to get hostname.
   * @param emailDto - Request body to send OTP email.
   * @returns Returns `OtpExpiredAtDto`.
   */
  @Post('send-otp')
  async sendOtp(@Req() request: Request, @Body() emailDto: EmailDto): Promise<OtpExpiredAtDto> {
    // Get account.
    const account = await this._accountService.getAccountByEmail(emailDto.email);

    // Create OTP.
    const otp = this._cryptoService.createOtp();

    // Start transaction to send OTP.
    // When email sending is failed, saved OTP will be removed.
    return this._entityManager.transaction(async (_entityManager) => {
      // Save OTP and get expiry date.
      const otpExpiredAt = await this._accountService.saveOtp(account, otp, _entityManager);

      this._logger.log(request.socket.remotePort);
      this._logger.log(request.protocol);
      this._logger.log(request.hostname);

      // Send OTP mail.
      await this._sendOtpEmail(emailDto.email, otp);

      // Create DTO and return.
      return new OtpExpiredAtDto({
        otpExpiredAt,
      });
    });
  }

  /** Send otp email */
  private async _sendOtpEmail(email: string, otp: string): Promise<void> {
    throw new Error('Method is not implemented');
  }

  /**
   * Sign in with email and OTP.
   * @param signInDto - Request body to sign in.
   * @returns Returns `ProfileDto`.
   */
  @Post('sign/in')
  async signIn(@Body() signInDto: SignInDto): Promise<ProfileDto> {
    // Get account.
    const account = await this._accountService.getAccountByEmail(signInDto.email);

    // Mark `Account` as signed and return `ProfileDto`.
    return this._entityManager.transaction(async (_entityManager) => {
      // Validate OTP.
      await this._accountService.validateOtp(account, signInDto.otp, _entityManager);

      // Mark `Account` as signed.
      const accessToken = await this._accountService.markAccountAsSigned(account, _entityManager);

      // Convert and return.
      return this._accountService.toProfileDto(account, accessToken);
    });
  }

  /**
   * Sign in with `accessToken`.
   * @param accessToken - Access token to sign in.
   */
  @Post('sign/in/token')
  @UseGuards(AuthGuard)
  async signInWithToken(@Headers('Authorization') accessToken: string): Promise<ProfileDto | void> {
    if (accessToken) {
      // Validate and get account.
      const account = await this._accountService.validateAccessToken(accessToken);

      // Convert and return.
      return this._accountService.toProfileDto(account, accessToken);
    } else {
      throw new UnauthorizedException(SIGN_REQUIRED);
    }
  }
}
