import { Column, CreateDateColumn, Entity, Generated, PrimaryColumn, Unique } from 'typeorm';

/** File entity. Filename is created with id + extension */
@Entity('file')
@Unique('file_id_unique', ['id'])
export class File {
  /** Random uuid id */
  @Generated('uuid')
  @PrimaryColumn({
    name: 'id',
    type: 'text',
  })
  id: string;

  /** File extension without dot */
  @Column({
    name: 'extension',
    type: 'text',
  })
  extension: string;

  /** File buffer data */
  @Column({
    name: 'buffer',
    type: 'bytea',
  })
  buffer: Buffer;

  /** File mimetype */
  @Column({
    name: 'mimetype',
    type: 'text',
  })
  mimetype: string;

  /** Created date */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    default: new Date(),
  })
  createdAt: Date | string;
}
