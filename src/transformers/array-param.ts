import { TransformFnParams } from 'class-transformer';

/**
 * A transformer to convert array of number.
 * @param params - Transform params.
 * @return Array of numbers.
 */
export const arrayParam: (params: TransformFnParams) => any = (params: TransformFnParams) => {
  if (params.value === undefined || params.value === null) {
    return [];
  } else if (params.value instanceof Array) {
    return params.value;
  } else if (typeof params.value === 'string') {
    return [params.value];
  } else {
    return [];
  }
};
