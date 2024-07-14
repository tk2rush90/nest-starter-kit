/** A DTO for paging result with cursor */
export class PagingResultDto<T> {
  /** Array of data */
  data: T[];

  /** Cursor to get next page */
  nextCursor?: string;

  /** Cursor to get previous page */
  previousCursor?: string;

  constructor(dto?: PagingResultDto<T>) {
    Object.assign(this, dto);
  }
}
