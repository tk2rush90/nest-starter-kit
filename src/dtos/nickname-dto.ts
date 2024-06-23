import { IsNotEmpty, IsString } from 'class-validator';

/** A DTO that contains for required `nickname` property */
export class NicknameDto {
  /** Nickname which is required */
  @IsString()
  @IsNotEmpty()
  nickname: string;
}
