import { Entity, OneToMany, Unique } from 'typeorm';
import { SignedAccount } from './signed-account';
import { OauthProvider } from '../types/oauth-provider';
import { EntityCommon } from './entity-common';
import { TextColumn } from '../decorators/text-column';
import { AccountRole } from '../types/account-role';

/** 계정 */
@Entity('account')
@Unique('account_email_index', ['email'])
@Unique('account_nickname_unique', ['nickname'])
export class Account extends EntityCommon {
  @TextColumn()
  email: string;

  @TextColumn()
  nickname: string;

  /** 각종 민감 정보 암호화 하기 위한 문자열 */
  @TextColumn()
  salt: string;

  @TextColumn({
    nullable: true,
  })
  avatarUrl: string | null;

  /** OAuth 아이디 제공자 */
  @TextColumn({
    nullable: true,
  })
  oauthProvider: OauthProvider | null;

  @TextColumn({
    nullable: true,
  })
  oauthId: string | null;

  /** 권한 컨트롤을 위한 계정 역할 */
  @TextColumn({
    default: 'user',
  })
  role: AccountRole;

  /** Relation to signed histories */
  @OneToMany(() => SignedAccount, (entity) => entity.account)
  signedAccounts: SignedAccount[];
}
