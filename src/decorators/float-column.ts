import { Column, ColumnOptions } from 'typeorm';

export function FloatColumn(options?: ColumnOptions) {
  return Column({ type: 'float', ...options });
}
