import { Body, Controller, Get, Headers, Post, Query, UseGuards } from '@nestjs/common';
import { EmailDto } from '../../dtos/email-dto';
import { NicknameDto } from '../../dtos/nickname-dto';
import { ProfileDto } from '../../dtos/profile-dto';
import { AuthGuard } from '../../guards/auth/auth.guard';
import { AuthApiService } from './auth-api.service';
import { DeletedAccountDto } from '../../dtos/deleted-account-dto';
import { AccessTokenDto } from '../../dtos/access-token-dto';
import { StartByKakaoDto } from '../../dtos/start-by-kakao-dto';

@Controller('auth')
export class AuthApiController {
  constructor(private readonly authApiService: AuthApiService) {}

  /** 이메일 중복 체크 */
  @Get('check/email')
  async checkEmail(@Query() query: EmailDto): Promise<void> {
    return this.authApiService.checkEmailDuplicated(query);
  }

  /** 닉네임 중복 체크 */
  @Get('check/nickname')
  async checkNickname(@Query() query: NicknameDto): Promise<void> {
    return this.authApiService.checkNicknameDuplicated(query);
  }

  /**
   * 구글 계정으로 시작하기
   * 기존 계정이 있을 경우 로그인, 없을 경우 새 계정 생성
   */
  @Post('start/google')
  async startByGoogle(@Body() body: AccessTokenDto): Promise<ProfileDto> {
    return this.authApiService.startByGoogle(body);
  }

  /**
   * 카카오 계정으로 시작하기
   * 기존 계정이 있을 경우 로그인, 없을 경우 새 계정 생성
   */
  @Post('start/kakao')
  async startByKakao(@Body() body: StartByKakaoDto): Promise<ProfileDto> {
    return this.authApiService.startByKakao(body);
  }

  /** 토큰을 이용한 자동 로그인 시도 */
  @Post('login/auto')
  @UseGuards(AuthGuard)
  async autoLogin(@Headers('Authorization') accessToken: string): Promise<ProfileDto | void> {
    return this.authApiService.autoLogin(accessToken);
  }

  /** 로그아웃 처리 */
  @Post('logout')
  async logout(@Headers('Authorization') accessToken: string): Promise<void> {
    await this.authApiService.logout(accessToken);
  }

  /** 계정 삭제 */
  @Post('account/delete')
  async deleteAccount(@Headers('Authorization') accessToken: string): Promise<DeletedAccountDto> {
    return this.authApiService.deleteAccount(accessToken);
  }
}
