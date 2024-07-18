import { Column, Entity, Generated, PrimaryColumn } from 'typeorm';
import { AccountJsonDto } from '../dtos/account-json-dto';

/** An entity for archived accounts that are deleted */
@Entity('archived_account')
export class ArchivedAccount {
  /** Archived account id */
  @Generated('uuid')
  @PrimaryColumn({
    name: 'id',
    type: 'uuid',
    primaryKeyConstraintName: 'archived_account_pk',
  })
  id: string;

  /** Account id */
  @Column({
    name: 'account_id',
    type: 'uuid',
  })
  accountId: string;

  /** Account data */
  @Column({
    name: 'account',
    type: 'json',
  })
  account: AccountJsonDto;

  /** Created date */
  @Column({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt: Date | string;
}
