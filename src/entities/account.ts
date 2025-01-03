import { Column, DeleteDateColumn, Entity, Generated, OneToMany, PrimaryColumn, Unique } from 'typeorm';
import { SignedAccount } from './signed-account';
import { OauthProvider } from '../types/oauth-provider';

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

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'time with time zone',
    nullable: true,
  })
  deletedAt: Date | string | null;

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
