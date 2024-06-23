import { TransformFnParams } from 'class-transformer';

/**
 * A transformer to convert array of JSON string to array object.
 * @param params - Transform params.
 * @return Array object.
 */
export const jsonArrayParam: (params: TransformFnParams) => any = (params: TransformFnParams) => {
  if (params.value !== undefined && params.value !== null) {
    return [];
  } else if (params.value instanceof Array) {
    return params.value.map((_item) => JSON.parse(_item));
  } else {
    return [JSON.parse(params.value)];
  }
};
