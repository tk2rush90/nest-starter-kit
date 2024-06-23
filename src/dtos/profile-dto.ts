import { IsBoolean, IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { IsNullable } from '../decorators/is-nullable';

/** A DTO for account profile */
export class ProfileDto {
  /** Account id */
  @IsString()
  @IsNotEmpty()
  id: string;

  /** Account email */
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /** Account nickname */
  @IsString()
  @IsNotEmpty()
  nickname: string;

  /** Status of author or not*/
  @IsBoolean()
  isAuthor: boolean;

  /** Status of manager or not */
  @IsBoolean()
  isManager: boolean;

  /** Uploaded filename for account avatar */
  @IsString()
  @IsNullable()
  avatarFilename: string | null;

  /** Access token */
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  constructor(dto?: ProfileDto) {
    Object.assign(this, dto);
  }
}
