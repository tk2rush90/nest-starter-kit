import { Column, Entity, Generated, PrimaryColumn } from 'typeorm';

/** Entity that contains detail of uploaded files */
@Entity('upload_detail')
export class UploadDetail {
  /** Random uuid id */
  @Generated('uuid')
  @PrimaryColumn({
    name: 'id',
    type: 'uuid',
    primaryKeyConstraintName: 'upload_detail_pk',
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
  @Column({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt: Date | string;
}
