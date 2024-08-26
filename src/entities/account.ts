import { Column, Entity, Generated, OneToMany, PrimaryColumn, Unique } from 'typeorm';
import { SignedAccount } from './signed-account';
import { OauthProvider } from '../types/oauth-provider';

/** Account table for users */
@Entity('account')
@Unique('account_email_index', ['email'])
@Unique('account_nickname_unique', ['nickname'])
export class Account {
  /** Account id */
  @Generated('uuid')
  @PrimaryColumn({
    name: 'id',
    type: 'uuid',
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

  /** Oauth provider */
  @Column({
    name: 'oauth_provider',
    type: 'text',
    nullable: true,
  })
  oauthProvider: OauthProvider | null;

  /** Unique id from the oauth provider */
  @Column({
    name: 'oauth_id',
    type: 'text',
    nullable: true,
  })
  oauthId: string | null;

  /** Account created date */
  @Column({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt: Date | string;

  /** Expiry date of account */
  @Column({
    name: 'account_expired_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  accountExpiredAt: Date | string | null;

  /** Relation to signed histories */
  @OneToMany(() => SignedAccount, (entity) => entity.account, {
    cascade: true,
  })
  signedAccounts: SignedAccount[];
}
