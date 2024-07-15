import { Column, CreateDateColumn, Entity, Generated, PrimaryColumn } from 'typeorm';

/** Entity that contains detail of uploaded files */
@Entity('upload_detail')
export class UploadDetail {
  /** Random uuid id */
  @Generated('uuid')
  @PrimaryColumn({
    name: 'id',
    type: 'text',
  })
  id: string;

  /** File storage path */
  @Column({
    name: 'storage_path',
    type: 'text',
  })
  storagePath: string;

  /** Original filename */
  @Column({
    name: 'filename',
    type: 'text',
  })
  filename: string;

  /** File size */
  @Column({
    name: 'file_size',
    type: 'bigint',
  })
  fileSize: string | number;

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
