import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateAccountDto {
  /** Nickname which is required */
  @IsString()
  @IsNotEmpty()
  nickname: string;

  /** New avatar url */
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  avatarUrl?: string;
}
