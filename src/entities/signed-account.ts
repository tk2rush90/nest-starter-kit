import { Column, CreateDateColumn, Entity, Generated, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Account } from './account';

/**
 * History of signed account.
 * It manages expiry date of each access token.
 */
@Entity('signed_account')
@Index('signed_account_unique_index', ['accountId', 'accessToken'], { unique: true })
export class SignedAccount {
  /** Signed account id */
  @Generated('increment')
  @PrimaryColumn({
    name: 'id',
    type: 'bigint',
    primaryKeyConstraintName: 'signed_account_pk',
  })
  id: string;

  /** Account id */
  @Column({
    name: 'account_id',
    type: 'bigint',
  })
  accountId: string;

  /** Access token encrypted with `salt` of account */
  @Column({
    name: 'access_token',
    type: 'text',
  })
  accessToken: string;

  /**
   * Expired date of signed account.
   * It should be refreshed when reading entity.
   */
  @Column({
    name: 'expired_at',
    type: 'timestamp with time zone',
  })
  expiredAt: Date | string;

  /** Created date */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    default: new Date(),
  })
  createdAt: Date | string;

  /** Relation to account */
  @ManyToOne(() => Account, (entity) => entity.signedAccounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'account_id',
    foreignKeyConstraintName: 'signed_account_account_fk',
  })
  account: Account;
}
