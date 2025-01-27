import { Body, Controller, Get, Headers, Put, UseGuards } from '@nestjs/common';
import { ProfileApiService } from './profile-api.service';
import { ProfileDto } from '../../dtos/profile-dto';
import { AuthGuard } from '../../guards/auth/auth.guard';
import { UpdateAccountDto } from '../../dtos/update-account-dto';

@Controller('profile')
@UseGuards(AuthGuard)
export class ProfileApiController {
  constructor(private readonly profileApiService: ProfileApiService) {}

  /** 액세스 토큰을 이용한 프로필 조회 */
  @Get()
  async getOneByAccessToken(@Headers('Authorization') accessToken: string): Promise<ProfileDto> {
    return this.profileApiService.getOneByAccessToken(accessToken);
  }

  /** 프로필 업데이트 */
  @Put()
  async update(@Headers('Authorization') accessToken: string, @Body() body: UpdateAccountDto): Promise<ProfileDto> {
    return this.profileApiService.update(accessToken, body);
  }
}
