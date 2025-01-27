import { Column, ColumnOptions } from 'typeorm';

export function BooleanColumn(options?: ColumnOptions) {
  return Column({ type: 'boolean', default: false, ...options });
}
