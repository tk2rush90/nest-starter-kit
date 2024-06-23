import { IsObject, IsOptional, IsString } from 'class-validator';

/** A DTO for paging result with cursor */
export class PagingResultDto<T> {
  /** Array of data */
  @IsObject({ each: true })
  data: T[];

  /** Cursor to get next page */
  @IsString()
  @IsOptional()
  nextCursor?: string;

  constructor(dto?: PagingResultDto<T>) {
    Object.assign(this, dto);
  }
}
