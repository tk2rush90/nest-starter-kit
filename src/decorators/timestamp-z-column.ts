import { Column, ColumnOptions } from 'typeorm';

export function TimestampZColumn(options?: ColumnOptions) {
  return Column({ type: 'timestamp with time zone', ...options });
}
