import { Generated, PrimaryColumn, PrimaryColumnOptions } from 'typeorm';

export function PrimaryUuidColumn(options?: PrimaryColumnOptions) {
  return function (target: Object, propertyName: string | symbol) {
    // @Generated('uuid') 데코레이터 적용
    Generated('uuid')(target, propertyName);

    // @PrimaryColumn 데코레이터 적용
    PrimaryColumn({
      type: 'uuid',
      ...options, // 추가 옵션을 전달할 수 있도록
    })(target, propertyName);
  };
}
