import { Column, ColumnOptions } from 'typeorm';

export function BigIntColumn(options?: ColumnOptions) {
  return Column({ type: 'bigint', ...options });
}
