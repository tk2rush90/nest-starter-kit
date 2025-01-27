// 기본적으로 'text' 타입이 적용된 @TextColumn() 데코레이터
import { Column, ColumnOptions } from 'typeorm';

export function TextColumn(options?: ColumnOptions) {
  return Column({ type: 'text', ...options });
}
