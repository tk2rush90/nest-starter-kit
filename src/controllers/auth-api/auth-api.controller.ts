import { Body, Controller, Get, Headers, Logger, Post, Query, UseGuards } from '@nestjs/common';
import { AccountService } from '../../services/account/account.service';
import { JoinDto } from '../../dtos/join-dto';
import { EmailDto } from '../../dtos/email-dto';
import { NicknameDto } from '../../dtos/nickname-dto';
import { OtpExpiredAtDto } from '../../dtos/otp-expired-at-dto';
import { LoginDto } from '../../dtos/login-dto';
import { ProfileDto } from '../../dtos/profile-dto';
import { AccountDto } from '../../dtos/account-dto';
import { AuthGuard } from '../../guards/auth/auth.guard';
import { createUUID } from '../../utils/crypto';

/** A controller that contains endpoint related with authentication */
@Controller('auth')
export class AuthApiController {
  private readonly _logger = new Logger('AuthApiController');

  constructor(private readonly _accountService: AccountService) {}

  /**
   * Check email duplication.
   * @param email
   * @throws DUPLICATED_EMAIL
   */
  @Get('check/email')
  async checkEmail(@Query() { email }: EmailDto): Promise<void> {
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] GET /auth/check/email`);

    return this._accountService.checkEmailDuplicated(requestUUID, email);
  }

  /**
   * Check nickname duplication.
   * @param nickname
   * @throws DUPLICATED_NICKNAME
   */
  @Get('check/nickname')
  async checkNickname(@Query() { nickname }: NicknameDto): Promise<void> {
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] GET /auth/check/nickname`);

    return this._accountService.checkNicknameDuplicated(requestUUID, nickname);
  }

  /**
   * Sign up to create new `Account`.
   * @param joinDto - Request body to sign up.
   * @throws DUPLICATED_EMAIL
   * @throws DUPLICATED_NICKNAME
   * @throws METHOD_NOT_IMPLEMENTED
   */
  @Post('join')
  async join(@Body() joinDto: JoinDto): Promise<AccountDto> {
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] GET /auth/join`);

    return this._accountService.join(requestUUID, joinDto);
  }

  /**
   * Send OTP to log in with account.
   * @param email
   * @throws ACCOUNT_NOT_FOUND
   */
  @Post('otp/send')
  async sendOtp(@Body() { email }: EmailDto): Promise<OtpExpiredAtDto> {
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] GET /auth/otp/send`);

    return this._accountService.sendOtp(requestUUID, email);
  }

  /**
   * Default login process.
   * @param signInDto
   * @throws ACCOUNT_NOT_FOUND
   * @throws OTP_NOT_FOUND
   * @throws EXPIRED_OTP
   * @throws INVALID_OTP
   */
  @Post('login')
  async login(@Body() signInDto: LoginDto): Promise<ProfileDto> {
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] GET /auth/login`);

    return this._accountService.login(requestUUID, signInDto);
  }

  /**
   * Auto login process with token.
   * @param accessToken
   * @throws SIGN_REQUIRED
   * @throws ACCOUNT_NOT_FOUND
   */
  @Post('login/auto')
  @UseGuards(AuthGuard)
  async autoLogin(@Headers('Authorization') accessToken: string): Promise<ProfileDto | void> {
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] GET /auth/login/auto`);

    return this._accountService.autoLogin(requestUUID, accessToken);
  }
}
