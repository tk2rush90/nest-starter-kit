import { OrderDirection } from '../types/order-direction';

/**
 * Sort `array` by `property` with `order` direction.
 * @param array - Array to sort.
 * @param property - Property name of item of `array`.
 * @param orderDirection - Order direction between `asc` and `desc`.
 * @returns Returns sorted array.
 */
export function sortBy<T>(array: T[], property: keyof T, orderDirection: OrderDirection): T[] {
  const sortFunction: (a: T, b: T) => number =
    orderDirection === 'ASC'
      ? (a: T, b: T) => (a[property] >= b[property] ? 1 : -1)
      : (a: T, b: T) => (a[property] < b[property] ? 1 : -1);

  return array.sort(sortFunction);
}

/**
 * Convert provided `value` as array.
 * When `value` is already array, it doesn't do anything.
 * When `value` is a single item with type `T`, convert to [T].
 * When `value` is `undefined` or `null`, return [].
 * @param value - Value to convert.
 * @return Converted array.
 */
export function forceArray<T>(value: T[] | T | undefined | null): T[] {
  if (value instanceof Array) {
    return value;
  } else if (value === undefined || value === null) {
    return [];
  } else {
    return [value];
  }
}
