import { Column, Entity } from 'typeorm';
import { TextColumn } from '../decorators/text-column';
import { PrimaryUuidColumn } from '../decorators/primary-uuid-column';
import { BigIntColumn } from '../decorators/big-int-column';

/** Entity that contains detail of uploaded files */
@Entity('upload_detail')
export class UploadDetail {
  @PrimaryUuidColumn()
  id: string;

  /** 파일 저장 경로 */
  @TextColumn()
  storagePath: string;

  /** 파일명 */
  @TextColumn()
  filename: string;

  /** 파일 사이즈 */
  @BigIntColumn()
  fileSize: string | number;

  /** Mimetype */
  @TextColumn()
  mimetype: string;

  /** 생성일 */
  @Column({
    name: 'created_at',
    type: 'timestamp with time zone',
  })
  createdAt: Date | string;
}
