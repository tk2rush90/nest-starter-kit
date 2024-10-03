import { Body, Controller, Get, Headers, Logger, Post, Query, UseGuards } from '@nestjs/common';
import { EmailDto } from '../../dtos/email-dto';
import { NicknameDto } from '../../dtos/nickname-dto';
import { ProfileDto } from '../../dtos/profile-dto';
import { AuthGuard } from '../../guards/auth/auth.guard';
import { createUUID } from '../../utils/crypto';
import { AuthApiService } from '../../services/auth-api/auth-api.service';
import { DeletedAccountDto } from '../../dtos/deleted-account-dto';
import { AccessTokenDto } from '../../dtos/access-token-dto';
import { CodeDto } from '../../dtos/code-dto';

/** A controller that contains endpoint related with authentication */
@Controller('auth')
export class AuthApiController {
  private readonly _logger = new Logger('AuthApiController');

  constructor(private readonly _authApiService: AuthApiService) {}

  /**
   * Check email duplication.
   * @param email
   * @throws DUPLICATED_EMAIL
   */
  @Get('check/email')
  async checkEmail(@Query() { email }: EmailDto): Promise<void> {
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] GET /auth/check/email`);

    return this._authApiService.checkEmailDuplicated(requestUUID, email);
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

    return this._authApiService.checkNicknameDuplicated(requestUUID, nickname);
  }

  /** Join or login by Goggle access token */
  @Post('start/google')
  async startByGoogle(@Body() accessTokenDto: AccessTokenDto): Promise<ProfileDto> {
    return this._authApiService.startByGoogle(accessTokenDto);
  }

  @Post('start/kakao')
  async startByKakao(@Body() body: CodeDto): Promise<ProfileDto> {
    return this._authApiService.startByKakao(body);
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

    this._logger.log(`[${requestUUID}] POST /auth/login/auto`);

    return this._authApiService.autoLogin(requestUUID, accessToken);
  }

  /**
   * Logout.
   * @param accessToken
   * @throws SIGN_REQUIRED
   * @throws ACCOUNT_NOT_FOUND
   */
  @Post('logout')
  async logout(@Headers('Authorization') accessToken: string): Promise<void> {
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] POST /auth/logout`);

    await this._authApiService.logout(requestUUID, accessToken);
  }

  /**
   * Delete account.
   * @param accessToken
   */
  @Post('account/delete')
  async deleteAccount(@Headers('Authorization') accessToken: string): Promise<DeletedAccountDto> {
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] POST /auth/account/delete`);

    return this._authApiService.deleteAccount(requestUUID, accessToken);
  }
}
