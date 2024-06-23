import { Column, CreateDateColumn, Entity, Generated, OneToMany, PrimaryColumn, Unique } from 'typeorm';
import { SignedAccount } from './signed-account';

/** Account table for users */
@Entity('account')
@Unique('account_email_index', ['email'])
@Unique('account_nickname_unique', ['nickname'])
export class Account {
  /** Account id */
  @Generated('increment')
  @PrimaryColumn({
    name: 'id',
    type: 'bigint',
    primaryKeyConstraintName: 'account_pk',
  })
  id: string;

  /** Random salt string that is used to encrypt sensitive information of user */
  @Column({
    name: 'salt',
    type: 'text',
  })
  salt: string;

  /** Email to use as singing account */
  @Column({
    name: 'email',
    type: 'text',
  })
  email: string;

  /** Nickname to use in platform */
  @Column({
    name: 'nickname',
    type: 'text',
  })
  nickname: string;

  /** Issued OTP to sign in. It should be encrypted with `salt` */
  @Column({
    name: 'otp',
    type: 'text',
    nullable: true,
  })
  otp: string | null;

  /** Expiry date of OTP */
  @Column({
    name: 'otp_expired_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  otpExpiredAt: Date | string | null;

  /** Avatar url */
  @Column({
    name: 'avatar_url',
    type: 'text',
    nullable: true,
  })
  avatarUrl: string | null;

  /** Account created date */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    default: new Date(),
  })
  createdAt: Date | string;

  /** Relation to signed histories */
  @OneToMany(() => SignedAccount, (entity) => entity.account, {
    cascade: true,
  })
  signedAccounts: SignedAccount[];
}
