import { DeepPartial, EntityManager, FindOneOptions, ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { PagingResultDto } from '../dtos/paging-result-dto';
import { OrderDirection } from '../types/order-direction';
import { NotFoundException } from '@nestjs/common';

/**
 * Get proper target repository.
 * When entityManager is provided, it returns new repository created from the entityManager.
 * @param baseRepository
 * @param entityManager
 */
export function getTargetRepository<E extends ObjectLiteral>(
  baseRepository: Repository<E>,
  entityManager?: EntityManager,
): Repository<E> {
  return entityManager ? entityManager.getRepository(baseRepository.target) : baseRepository;
}

/**
 * Create entity and return.
 * @param repository
 * @param entityLike
 */
export async function createWrapper<E extends ObjectLiteral>(
  repository: Repository<E>,
  entityLike: DeepPartial<E>,
): Promise<E>;

/**
 * Create entities and return.
 * @param repository
 * @param entityLikeArray
 */
export async function createWrapper<E extends ObjectLiteral>(
  repository: Repository<E>,
  entityLikeArray: DeepPartial<E>[],
): Promise<E>;

export async function createWrapper<E extends ObjectLiteral>(
  repository: Repository<E>,
  entityLikeOrEntityLikeArray: DeepPartial<E> | DeepPartial<E>[],
): Promise<E | E[]> {
  const entity = repository.create(entityLikeOrEntityLikeArray as any);

  await repository.save(entity);

  return entity;
}

/**
 * Get an entity definitely.
 * @param repository
 * @param options
 * @param errorCode
 */
export async function getOneWrapper<E extends ObjectLiteral>(
  repository: Repository<E>,
  options: FindOneOptions<E>,
  errorCode?: string,
): Promise<E> {
  const entity = await repository.findOne(options);

  if (!entity) {
    throw new NotFoundException(errorCode || repository.metadata.name);
  }

  return entity;
}

/**
 * Run cursor pagination with SelectQueryBuilder.
 * @param selectQueryBuilder
 * @param keyColumns
 * @param orderDirection
 * @param cursor
 * @param take
 * @param cursorBuilder
 */
export async function cursorPaginate<E extends ObjectLiteral>({
  selectQueryBuilder,
  keyColumns,
  orderDirection,
  nextCursor,
  previousCursor,
  take,
  cursorBuilder,
}: CursorPaginateOptions<E>): Promise<PagingResultDto<E>> {
  // Clone after ordered.
  const previousSelectQueryBuilder = selectQueryBuilder.clone();

  const nextSelectQueryBuilder = selectQueryBuilder.clone();

  let data: E[] = [];

  selectQueryBuilder.take(take);

  if (nextCursor) {
    const cursorValues = decodeCursor(nextCursor);

    const comparisonSign = getComparisonSign(orderDirection);

    // Set cursors.
    if (cursorValues.length > 0) {
      // Add orders.
      for (let i = 0; i < keyColumns.length; i++) {
        const _keyColumn = keyColumns[i];

        selectQueryBuilder.addOrderBy(_keyColumn, orderDirection);
      }

      const parametersAndKeys = createParametersAndKeys(cursorValues);

      selectQueryBuilder.andWhere(
        `(${keyColumns.join(',')}) ${comparisonSign} (${parametersAndKeys.parameterKeys.join(',')})`,
        parametersAndKeys.parameters,
      );
    }

    data = await selectQueryBuilder.getMany();
  } else if (previousCursor) {
    const cursorValues = decodeCursor(previousCursor);

    const reversedOrderDirection = getReversedOrderDirection(orderDirection);

    const comparisonSign = getComparisonSign(reversedOrderDirection);

    // Set cursors.
    if (cursorValues.length > 0) {
      // Add orders.
      for (let i = 0; i < keyColumns.length; i++) {
        const _keyColumn = keyColumns[i];

        selectQueryBuilder.addOrderBy(_keyColumn, reversedOrderDirection);
      }

      const parametersAndKeys = createParametersAndKeys(cursorValues);

      selectQueryBuilder.andWhere(
        `(${keyColumns.join(',')}) ${comparisonSign} (${parametersAndKeys.parameterKeys.join(',')})`,
        parametersAndKeys.parameters,
      );
    }

    data = await selectQueryBuilder.getMany();

    // Reverse.
    data.reverse();
  } else {
    data = await selectQueryBuilder.getMany();
  }

  // Create cursor for first data to get previous cursor.
  const newPreviousCursorValues = data[0] ? cursorBuilder(data[0]) : undefined;

  const newPreviousCursor = newPreviousCursorValues ? encodeCursor(newPreviousCursorValues) : '';

  // Create cursor for last data to get next cursor.
  const newNextCursorValues = data[data.length - 1] ? cursorBuilder(data[data.length - 1]) : undefined;

  const newNextCursor = newNextCursorValues ? encodeCursor(newNextCursorValues) : '';

  return new PagingResultDto<E>({
    data,
    previousCursor: (await hasPreviousData({
      selectQueryBuilder: previousSelectQueryBuilder,
      previousCursor: newPreviousCursor,
      orderDirection,
      keyColumns,
    }))
      ? newPreviousCursor
      : '',
    nextCursor: (await hasNextData({
      selectQueryBuilder: nextSelectQueryBuilder,
      nextCursor: newNextCursor,
      orderDirection,
      keyColumns,
    }))
      ? newNextCursor
      : '',
  });
}

/**
 * Get status of having previous data.
 * @param selectQueryBuilder
 * @param previousCursor
 * @param orderDirection
 * @param keyColumns
 */
async function hasPreviousData<E extends ObjectLiteral>({
  selectQueryBuilder,
  previousCursor,
  orderDirection,
  keyColumns,
}: Omit<CursorPaginateOptions<E>, 'take' | 'cursorBuilder'>): Promise<boolean> {
  // Set cursors.
  if (previousCursor) {
    const cursorValues = decodeCursor(previousCursor);

    if (cursorValues.length > 0) {
      const comparisonSign = getComparisonSign(getReversedOrderDirection(orderDirection));

      const parametersAndKeys = createParametersAndKeys(cursorValues);

      selectQueryBuilder.andWhere(
        `(${keyColumns.join(',')}) ${comparisonSign} (${parametersAndKeys.parameterKeys.join(',')})`,
        parametersAndKeys.parameters,
      );

      const previousCursorData = await selectQueryBuilder.getOne();

      return !!previousCursorData;
    }
  }

  return false;
}

/**
 * Get status of having next data.
 * @param selectQueryBuilder
 * @param previousCursor
 * @param orderDirection
 * @param keyColumns
 */
async function hasNextData<E extends ObjectLiteral>({
  selectQueryBuilder,
  nextCursor,
  orderDirection,
  keyColumns,
}: Omit<CursorPaginateOptions<E>, 'take' | 'cursorBuilder'>): Promise<boolean> {
  // Set cursors.
  if (nextCursor) {
    const cursorValues = decodeCursor(nextCursor);

    if (cursorValues.length > 0) {
      const comparisonSign = getComparisonSign(orderDirection);

      const parametersAndKeys = createParametersAndKeys(cursorValues);

      selectQueryBuilder.andWhere(
        `(${keyColumns.join(',')}) ${comparisonSign} (${parametersAndKeys.parameterKeys.join(',')})`,
        parametersAndKeys.parameters,
      );

      const nextCursorData = await selectQueryBuilder.getOne();

      return !!nextCursorData;
    }
  }

  return false;
}

/**
 * Create parameters and keys.
 * @param cursorValues
 */
function createParametersAndKeys(cursorValues: any[]): ParametersAndKeys {
  const parameterKeys: string[] = [];

  const parameters: ObjectLiteral = {};

  cursorValues.forEach((_cursorValue, index) => {
    const parameterKey = `cursorValue${index}`;

    parameters[parameterKey] = _cursorValue;
    parameterKeys.push(`:${parameterKey}`);
  });

  return {
    parameterKeys,
    parameters,
  };
}

/**
 * Encode cursor values.
 * @param cursorArray - Cursor values. Items order is important.
 * @returns Returns encoded string.
 */
function encodeCursor(cursorArray: any[]): string {
  // To prevent error with Korean, use `encodeURI()` function.
  return btoa(encodeURI(JSON.stringify(cursorArray)));
}

/**
 * Decode cursor string.
 * @param cursor - Cursor string.
 * @returns Returns decoded cursor values.
 */
function decodeCursor(cursor: string): any[] {
  // To get Korean, use `decodeURI()` function.
  return JSON.parse(decodeURI(atob(cursor)));
}

function getReversedOrderDirection(orderDirection: OrderDirection): OrderDirection {
  return orderDirection === 'ASC' ? 'DESC' : 'ASC';
}

function getComparisonSign(orderDirection: OrderDirection): string {
  return orderDirection === 'ASC' ? '>' : '<';
}

export interface CursorPaginateOptions<E extends ObjectLiteral> {
  /** SelectQueryBuilder to get cursor paginating result */
  selectQueryBuilder: SelectQueryBuilder<E>;

  /** Key columns to be added to andWhere() method */
  keyColumns: string[];
  orderDirection: OrderDirection;
  nextCursor?: string;
  previousCursor?: string;
  take: number;
  cursorBuilder: (item: E) => any[] | void;
}

interface ParametersAndKeys {
  parameters: ObjectLiteral;
  parameterKeys: string[];
}
