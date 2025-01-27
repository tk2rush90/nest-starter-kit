import { Column, Entity, Generated, PrimaryColumn } from 'typeorm';

@Entity()
export class EntityCommon {
  /** 아이디 */
  @Generated('increment')
  @PrimaryColumn({
    name: 'id',
    type: 'bigint',
  })
  id: string;

  /** 생성일 */
  @Column({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt: Date | string;
}
