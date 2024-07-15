import { Body, Controller, Get, Headers, Logger, Put, UseGuards } from '@nestjs/common';
import { MeApiService } from '../../services/me-api/me-api.service';
import { ProfileDto } from '../../dtos/profile-dto';
import { AuthGuard } from '../../guards/auth/auth.guard';
import { createUUID } from '../../utils/crypto';
import { UpdateAccountDto } from '../../dtos/update-account-dto';

@Controller('me')
@UseGuards(AuthGuard)
export class MeApiController {
  private readonly _logger = new Logger('MeApiController');

  constructor(private readonly _meApiService: MeApiService) {}

  /**
   * Get account profile of signed user.
   * @param accessToken
   * @throws SIGN_REQUIED
   * @throws ACCOUNT_NOT_FOUND
   */
  @Get()
  async getAccountProfile(@Headers('Authorization') accessToken: string): Promise<ProfileDto> {
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] GET /me`);

    return this._meApiService.getAccountProfile(requestUUID, accessToken);
  }

  @Put()
  async updateAccountProfile(
    @Headers('Authorization') accessToken: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ): Promise<ProfileDto> {
    const requestUUID = createUUID();

    this._logger.log(`[${requestUUID}] PUT /me`);

    return this._meApiService.updateAccountProfile(requestUUID, accessToken, updateAccountDto);
  }
}
