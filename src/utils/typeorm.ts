import { EntityManager, EntityTarget, ObjectLiteral, Repository, SelectQueryBuilder, ValueTransformer } from 'typeorm';
import { PagingResultDto } from '../dto/paging-result-dto';
import { OrderDirection } from '../types/order-direction';
import { Logger } from '@nestjs/common';

/**
 * Get a provided `repository` or repository from `entityManager` which is running in transaction.
 * @param entityTarget - An entity target to get repository from `entityManager`.
 * @param repository - Fallback repository to use when `entityManager` is not provided.
 * @param entityManager - Optional `EntityManager`. It can be provided to get repository in transaction.
 * @returns Returns target repository.
 */
export function getRepository<T extends ObjectLiteral>(
  entityTarget: EntityTarget<T>,
  repository: Repository<T>,
  entityManager?: EntityManager,
): Repository<T> {
  return entityManager ? entityManager.getRepository(entityTarget) : repository;
}

/**
 * Encode cursor values.
 * @param cursorArray - Cursor values. Items order is important.
 * @returns Returns encoded string.
 */
export function encodeCursor(cursorArray: any[]): string {
  // To prevent error with Korean, use `encodeURI()` function.
  return btoa(encodeURI(JSON.stringify(cursorArray)));
}

/**
 * Decode cursor string.
 * @param cursor - Cursor string.
 * @returns Returns decoded cursor values.
 */
export function decodeCursor(cursor: string): any[] {
  // To get Korean, use `decodeURI()` function.
  return JSON.parse(decodeURI(atob(cursor)));
}

/**
 * Paginate with `SelectQueryBuilder` to get `PagingResultDto`.
 * @param selectQueryBuilder - `SelectQueryBuilder` to get data. This method only runs `getMany()` method.
 * @param buildCursor - Function to build cursor array. Parameter `item` is the last item of loaded data.
 *  It should return values for sorting columns.
 */
export async function paginate<T extends ObjectLiteral>(
  selectQueryBuilder: SelectQueryBuilder<T>,
  buildCursor: (item: T) => any[] | void,
): Promise<PagingResultDto<T>> {
  const logger = new Logger('paginate');

  logger.log('Paginate query: ' + selectQueryBuilder.getQuery());
  logger.log('Paginate parameters: ' + JSON.stringify(selectQueryBuilder.getParameters()));

  // Get data.
  const data = await selectQueryBuilder.getMany();

  // Get last item.
  const lastItem = data[data.length - 1];

  // Create cursor.
  const cursor = lastItem ? buildCursor(lastItem) : undefined;

  // Create `PagingResultDto`.
  return new PagingResultDto<T>({
    data,
    // When `lastItem` exists, build cursor.
    nextCursor: cursor ? encodeCursor(cursor) : undefined,
  });
}

/**
 * Get inequality sign for cursor pagination by `orderDirection`.
 * @param orderDirection - Order direction to get proper sign.
 * @returns Returns sign by `orderDirection`.
 */
export function getCursorSign(orderDirection: OrderDirection): string {
  return orderDirection === 'ASC' ? '>' : '<';
}

/** Value transformer for number column */
export const numberColumnTransformer: ValueTransformer = {
  from: (value: any) => (value === undefined || value === null ? 0 : parseFloat(value)),
  to: (value: any) => value,
};
