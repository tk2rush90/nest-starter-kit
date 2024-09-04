import { IsNotEmpty, IsString } from 'class-validator';

export class AccessTokenDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
