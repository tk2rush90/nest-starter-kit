import { Body, Controller, Get, Headers, Logger, Put, UseGuards } from '@nestjs/common';
import { ProfileApiService } from '../../services/profile-api/profile-api.service';
import { ProfileDto } from '../../dtos/profile-dto';
import { AuthGuard } from '../../guards/auth/auth.guard';
import { UpdateAccountDto } from '../../dtos/update-account-dto';

@Controller('me')
@UseGuards(AuthGuard)
export class ProfileApiController {
  private readonly _logger = new Logger('ProfileApiController');

  constructor(private readonly _meApiService: ProfileApiService) {}

  /** 액세스 토큰을 이용한 프로필 조회 */
  @Get()
  async getOneByAccessToken(@Headers('Authorization') accessToken: string): Promise<ProfileDto> {
    return this._meApiService.getOneByAccessToken(accessToken);
  }

  /** 프로필 업데이트 */
  @Put()
  async update(@Headers('Authorization') accessToken: string, @Body() body: UpdateAccountDto): Promise<ProfileDto> {
    return this._meApiService.update(accessToken, body);
  }
}
