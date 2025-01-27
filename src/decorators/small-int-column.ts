import { Column, ColumnOptions } from 'typeorm';

export function SmallIntColumn(options?: ColumnOptions) {
  return Column({ type: 'smallint', ...options });
}
