/** A DTO that contains `otpExpiredAt` */
export class OtpExpiredAtDto {
  /** Expiry date of OTP */
  otpExpiredAt: Date;

  constructor(dto: OtpExpiredAtDto) {
    Object.assign(this, dto);
  }
}
