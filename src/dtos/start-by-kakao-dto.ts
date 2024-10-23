import { IsNotEmpty, IsString } from 'class-validator';

export class StartByKakaoDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  redirectUri: string;
}
