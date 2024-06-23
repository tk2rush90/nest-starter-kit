import { TransformFnParams } from 'class-transformer';

/**
 * A transformer to convert JSON string to object.
 * @param params - Transform params.
 * @return Object.
 */
export const jsonParam: (params: TransformFnParams) => any = (params: TransformFnParams) => {
  if (params.value !== undefined && params.value !== null) {
    return JSON.parse(params.value);
  } else {
    return undefined;
  }
};
