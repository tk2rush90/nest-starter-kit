import { ValueTransformer } from 'typeorm';

export const numberColumn: ValueTransformer = {
  from(value: any): any {
    return value === null ? null : parseFloat(value);
  },
  to(value: any): any {
    return value;
  },
};
