/** A DTO for account profile */
export class ProfileDto {
  /** Account id */
  id: string;

  /** Account nickname */
  nickname: string;

  /** Access token */
  accessToken: string;

  constructor(dto?: ProfileDto) {
    Object.assign(this, dto);
  }
}
