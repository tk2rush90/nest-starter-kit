import { IsNotEmpty, IsString } from 'class-validator';

/** A DTO for account profile */
export class ProfileDto {
  /** Account id */
  @IsString()
  @IsNotEmpty()
  id: string;

  /** Account nickname */
  @IsString()
  @IsNotEmpty()
  nickname: string;

  /** Access token */
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  constructor(dto?: ProfileDto) {
    Object.assign(this, dto);
  }
}
