import { TransformFnParams } from 'class-transformer/types/interfaces';

/**
 * A transformer to convert array of number.
 * @param params - Transform params.
 * @return Array of numbers.
 */
export const numberArrayParam: (params: TransformFnParams) => any = (params: TransformFnParams) => {
  if (params.value === undefined || params.value === null) {
    return [];
  } else if (params.value instanceof Array) {
    return params.value.map((_item) => parseInt(_item));
  } else {
    return [params.value];
  }
};
