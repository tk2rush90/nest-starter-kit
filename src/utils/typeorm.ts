import {
  Brackets,
  DeepPartial,
  EntityManager,
  FindOneOptions,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { PagingResultDto } from '../dtos/paging-result-dto';
import { OrderDirection } from '../types/order-direction';
import { Logger, NotFoundException } from '@nestjs/common';
import { camelToSnakeCase } from './string';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

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
    throw new NotFoundException(
      errorCode || camelToSnakeCase(repository.metadata.name).toUpperCase().substring(1) + '_NOT_FOUND',
    );
  }

  return entity;
}

/** 단일 엔티티 존재 여부 체크 및 업데이트 후 업데이트 된 엔티티 리턴 */
export async function updateOneWrapper<E extends ObjectLiteral>(
  repository: Repository<E>,
  criteria: FindOptionsWhere<E>,
  partialEntity: QueryDeepPartialEntity<E>,
): Promise<E> {
  // 존재 여부 체크
  await getOneWrapper(repository, {
    where: criteria,
  });

  await repository.update(criteria, partialEntity);

  // 업데이트 된 entity 리턴
  return await getOneWrapper(repository, {
    where: criteria,
  });
}

/** 단일 엔티티 존재 여부 체크 및 삭제 */
export async function deleteOneWrapper<E extends ObjectLiteral>(
  repository: Repository<E>,
  criteria: FindOptionsWhere<E>,
): Promise<void> {
  // 존재 여부 체크
  await getOneWrapper(repository, {
    where: criteria,
  });

  await repository.delete(criteria);
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
  const logger = new Logger('cursorPaginate');

  const targetOrderDirection = previousCursor ? getReversedOrderDirection(orderDirection) : orderDirection;

  // Add orders.
  for (let i = 0; i < keyColumns.length; i++) {
    const _keyColumn = keyColumns[i];

    selectQueryBuilder.addOrderBy(_keyColumn, targetOrderDirection);
  }

  // Clone after ordered.
  const previousSelectQueryBuilder = selectQueryBuilder.clone();

  const nextSelectQueryBuilder = selectQueryBuilder.clone();

  selectQueryBuilder.take(take);

  if (nextCursor) {
    addCompositeColumnWhere(selectQueryBuilder, keyColumns, nextCursor, targetOrderDirection);
  } else if (previousCursor) {
    addCompositeColumnWhere(selectQueryBuilder, keyColumns, previousCursor, targetOrderDirection);
  }

  const queryAndParameters = selectQueryBuilder.getQueryAndParameters();

  logger.debug('Query: ' + queryAndParameters[0]);
  logger.debug('Parameters: ' + JSON.stringify(queryAndParameters[1]));

  const data = await selectQueryBuilder.getMany();

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
      orderDirection: targetOrderDirection,
      keyColumns,
    }))
      ? newPreviousCursor
      : '',
    nextCursor: (await hasNextData({
      selectQueryBuilder: nextSelectQueryBuilder,
      nextCursor: newNextCursor,
      orderDirection: targetOrderDirection,
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
  const logger = new Logger('hasPreviousData');

  // Set cursors.
  if (previousCursor) {
    addCompositeColumnWhere(selectQueryBuilder, keyColumns, previousCursor, orderDirection);

    const queryAndParameters = selectQueryBuilder.getQueryAndParameters();

    logger.debug('Query: ' + queryAndParameters[0]);
    logger.debug('Parameters: ' + JSON.stringify(queryAndParameters[1]));

    const previousCursorData = await selectQueryBuilder.getOne();

    return !!previousCursorData;
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
  const logger = new Logger('hasNextData');

  // Set cursors.
  if (nextCursor) {
    addCompositeColumnWhere(selectQueryBuilder, keyColumns, nextCursor, orderDirection);

    const queryAndParameters = selectQueryBuilder.getQueryAndParameters();

    logger.debug('Query: ' + queryAndParameters[0]);
    logger.debug('Parameters: ' + JSON.stringify(queryAndParameters[1]));

    const nextCursorData = await selectQueryBuilder.getOne();

    return !!nextCursorData;
  }

  return false;
}

/**
 * Add where condition to selectQueryBuilder for composite columns.
 * @param selectQueryBuilder
 * @param keyColumns
 * @param cursor
 * @param orderDirection
 */
function addCompositeColumnWhere<D extends ObjectLiteral>(
  selectQueryBuilder: SelectQueryBuilder<D>,
  keyColumns: string[],
  cursor: string,
  orderDirection: OrderDirection,
): void {
  if (cursor) {
    const cursorValues = decodeCursor(cursor);

    const comparisonSign = getComparisonSign(orderDirection);

    const parametersAndKeys = createParametersAndKeys(cursorValues);

    selectQueryBuilder.andWhere(
      new Brackets((queryBuilder) => {
        for (let i = 0; i < keyColumns.length; i++) {
          const _keyColumns = keyColumns.slice(0, i + 1);

          const _parameterKeys = parametersAndKeys.parameterKeys.slice(0, i + 1);

          queryBuilder.orWhere(
            new Brackets((_queryBuilder) => {
              for (let j = 0; j < _keyColumns.length; j++) {
                const _keyColumn = _keyColumns[j];

                const _parameterKey = _parameterKeys[j];

                if (_keyColumns.length - 1 === j) {
                  _queryBuilder.andWhere(`${_keyColumn} ${comparisonSign} ${_parameterKey}`);
                } else {
                  _queryBuilder.andWhere(`${_keyColumn} = ${_parameterKey}`);
                }
              }
            }),
          );
        }
      }),
    );

    selectQueryBuilder.setParameters(parametersAndKeys.parameters);
  }
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
