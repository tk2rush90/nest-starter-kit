import { IsDate } from 'class-validator';

/** A DTO that contains `otpExpiredAt` */
export class OtpExpiredAtDto {
  /** Expiry date of OTP */
  @IsDate()
  otpExpiredAt: Date;

  constructor(dto: OtpExpiredAtDto) {
    Object.assign(this, dto);
  }
}
