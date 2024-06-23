import { TransformFnParams } from 'class-transformer';

/**
 * A transformer to convert boolean string to boolean.
 * @param params - Transform params.
 * @return Boolean value.
 */
export const booleanParam: (params: TransformFnParams) => any = (params: TransformFnParams) => {
  return params.value.toString().toLowerCase() === 'true';
};
