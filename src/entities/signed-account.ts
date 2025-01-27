import { Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Account } from './account';
import { EntityCommon } from './entity-common';
import { BigIntColumn } from '../decorators/big-int-column';
import { TextColumn } from '../decorators/text-column';
import { TimestampZColumn } from '../decorators/timestamp-z-column';

/** 로그인 한 계정 정보 */
@Entity('signed_account')
@Index('signed_account_unique_index', ['accountId', 'accessToken'], { unique: true })
export class SignedAccount extends EntityCommon {
  @BigIntColumn()
  accountId: string;

  /** `Account.salt`로 암호화 된 액세스 토큰 */
  @TextColumn()
  accessToken: string;

  /** 로그인 정보 만료일. 토큰 자체의 `expiredIn` 대신 이 값 사용해서 토큰 검증 */
  @TimestampZColumn()
  expiredAt: Date | string;

  @ManyToOne(() => Account, (entity) => entity.signedAccounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'account_id',
  })
  account: Account;
}
