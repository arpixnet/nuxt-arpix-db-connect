import { GraphQLClient, gql } from 'graphql-request'
import type {
  DatabaseInterface,
  WhereClause,
  OnConflictClause,
  BatchOperation as IBatchOperation,
  QueryOptions,
  OrderByClause,
} from '../interface/database.interface'

export interface IGraphQLService extends Omit<DatabaseInterface, 'query' | 'mutate'> {
  get<T = unknown>(
    tableName: string,
    options: {
      select: string | string[] | Record<string, unknown>
      where?: WhereClause
      limit?: number
      offset?: number
      orderBy?: OrderByClause | OrderByClause[]
      aggregate?: string
    },
    token?: string
  ): Promise<T>

  insert<T = unknown>(
    tableName: string,
    data: Record<string, unknown> | Record<string, unknown>[],
    onConflict?: OnConflictClause | null,
    returning?: string | string[],
    token?: string
  ): Promise<T>

  update<T = unknown>(
    tableName: string,
    data: Record<string, unknown>,
    where: WhereClause,
    returning?: string | string[],
    token?: string
  ): Promise<T>

  updateMany<T = unknown>(
    tableName: string,
    data: Array<{ data: Record<string, unknown> | Record<string, unknown>[], where: WhereClause }>,
    returning?: string | string[],
    token?: string
  ): Promise<T>

  delete<T = unknown>(
    tableName: string,
    where: WhereClause,
    returning?: string | string[],
    token?: string
  ): Promise<T>

  batch<T = unknown>(operations: IBatchOperation[], token?: string): Promise<T>

  getClient(token?: string): GraphQLClient

  query<T = unknown>(query: string, options?: QueryOptions): Promise<T>

  mutate<T = unknown>(mutation: string, options?: QueryOptions): Promise<T>
}

type BatchOperation = IBatchOperation

const createQuery = (
  tableName: string,
  select: string | string[] | Record<string, unknown>,
  where: WhereClause | null = null,
  limit: number | null = null,
  offset: number | null = null,
  orderBy: OrderByClause | OrderByClause[] | null = null,
  aggregate: string | null = null,
): string => {
  const args = []
  if (where) args.push(`where: ${JSON.stringify(where).replace(/"([^"]+)":/g, '$1:')}`)
  if (limit) args.push(`limit: ${limit}`)
  if (offset) args.push(`offset: ${offset}`)
  if (orderBy) args.push(`order_by: ${JSON.stringify(orderBy).replace(/"([^"]+)":\s*"([^"]+)"/g, '$1: $2')}`)

  let fields = `${tableName}${args.length ? `(${args.join(', ')})` : ''} { ${select} }`

  if (aggregate) {
    fields += `
      ${tableName}_aggregate${args.length ? `(${args.join(', ')})` : ''} {
        ${aggregate}
      }
    `
  }

  return `query { ${fields} }`
}

const createInsertMutation = (
  tableName: string,
  data: Record<string, unknown> | Record<string, unknown>[],
  onConflict: OnConflictClause | null = null,
  returning: string = 'affected_rows',
): string => {
  if (!data) throw new Error('error.insertMissingData')
  if (!Array.isArray(data)) data = [data]
  if (data.length === 0) throw new Error('error.insertMissingData')

  const args = [`objects: ${JSON.stringify(data).replace(/"([^"]+)":/g, '$1:')}`]

  if (onConflict) {
    args.push(`on_conflict: ${JSON.stringify(onConflict).replace(/"(\w+)":/g, '$1:').replace(/"(\w+)"(?=\s*[,}\]])/g, '$1')}`)
  }

  return `
    mutation {
      insert_${tableName}(${args.join(', ')}) {
        ${returning}
      }
    }
  `
}

const createUpdateMutation = (
  tableName: string,
  data: Record<string, unknown>,
  where: WhereClause,
  returning: string = 'affected_rows',
): string => {
  return `
      mutation {
          update_${tableName}(
              where: ${JSON.stringify(where).replace(/"([^"]+)":/g, '$1:')},
              _set: ${JSON.stringify(data).replace(/"([^"]+)":/g, '$1:')}
          ) {
              ${returning}
          }
      }
  `
}

const createUpdateManyMutation = (
  tableName: string,
  updates: Array<{ data: Record<string, unknown> | Record<string, unknown>[], where: WhereClause }>,
  returning: string = 'affected_rows',
): string => {
  const updatesFormatted = updates.map(update => `{
    where: ${JSON.stringify(update.where).replace(/"([^"]+)":/g, '$1:')},
    _set: ${JSON.stringify(update.data).replace(/"([^"]+)":/g, '$1:')}
  }`).join(', ')

  return `
    mutation {
      update_${tableName}_many(updates: [${updatesFormatted}]) {
        ${returning}
      }
    }
  `
}

const createDeleteMutation = (
  tableName: string,
  where: WhereClause,
  returning: string = 'affected_rows',
): string => {
  return `
    mutation {
      delete_${tableName}(where: ${JSON.stringify(where).replace(/"([^"]+)":/g, '$1:')}) {
        ${returning}
      }
    }
  `
}

export class GraphQLServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GraphQLServiceError'
  }
}

export class NetworkError extends GraphQLServiceError {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class GraphQLError extends GraphQLServiceError {
  details?: unknown

  constructor(message: string) {
    super(message)
    this.name = 'GraphQLError'
  }
}

export class ValidationError extends GraphQLServiceError {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class PermissionDeniedError extends GraphQLServiceError {
  constructor(message: string) {
    super(message)
    this.name = 'PermissionDeniedError'
  }
}

class GraphQLService implements IGraphQLService {
  private url: string
  private debug: boolean
  private defaultHeaders: Record<string, string>

  constructor(options: {
    url: string
    debug?: boolean
    headers?: Record<string, string>
  }) {
    this.url = options.url
    this.debug = options.debug || false
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }
  }

  getClient(token?: string): GraphQLClient {
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return new GraphQLClient(this.url, { headers })
  }

  private async handleRequest<T>(operation: () => Promise<T>): Promise<T> {
    try {
      const result = await operation()
      if (this.debug) console.info('Operation successful:', result)
      return result
    }
    catch (error: unknown) {
      if (this.debug) console.error('Operation failed:', error)

      // Network error
      if (error instanceof Error && error.message.includes('Network')) {
        throw new NetworkError('error.networkError')
      }

      // GraphQL error
      const graphqlError = error as { response?: { errors?: Array<{ extensions?: { code?: string } }> } }
      if (graphqlError?.response?.errors) {
        const firstError = graphqlError.response.errors[0]

        if (firstError?.extensions?.code === 'permission-denied') {
          throw new PermissionDeniedError('error.permissionDenied')
        }

        if (firstError?.extensions?.code === 'invalid-jwt') {
          throw new PermissionDeniedError('error.invalidJwt')
        }

        throw new GraphQLError('error.graphQLOperationFailed')
      }

      // Validation error
      if (error instanceof GraphQLServiceError) {
        throw new ValidationError('error.validationError')
      }

      // Unexpected error
      throw new GraphQLServiceError('error.unexpectedError')
    }
  }

  private createBatchMutation(operations: BatchOperation[]): string {
    const mutations = operations.map((op, index) => {
      const alias = `op${index}`
      switch (op.type) {
        case 'insert':
          return `
              ${alias}: insert_${op.table}(
                  objects: ${JSON.stringify(op.data).replace(/"([^"]+)":/g, '$1:')}
                  ${op.onConflict ? `, on_conflict: ${JSON.stringify(op.onConflict).replace(/"([^"]+)":/g, '$1:')}` : ''}
              ) {
                  ${op.returning || 'affected_rows'}
              }
          `
        case 'update':
          return `
              ${alias}: update_${op.table}(
                  where: ${JSON.stringify(op.where).replace(/"([^"]+)":/g, '$1:')}
                  _set: ${JSON.stringify(op.data).replace(/"([^"]+)":/g, '$1:')}
              ) {
                  ${op.returning || 'affected_rows'}
              }
          `
        case 'delete':
          return `
              ${alias}: delete_${op.table}(
                  where: ${JSON.stringify(op.where).replace(/"([^"]+)":/g, '$1:')}
              ) {
                  ${op.returning || 'affected_rows'}
              }
          `
        default:
          throw new ValidationError('error.invalidOperationType')
      }
    })

    return `mutation { ${mutations.join('\n')} }`
  }

  public async query<T = unknown>(query: string, options?: QueryOptions): Promise<T> {
    return this.handleRequest(async () => {
      const client = this.getClient(options?.headers ? undefined : options?.variables?.token as string)
      if (options?.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          client.setHeader(key, value)
        })
      }
      return await client.request(gql`${query}`, options?.variables)
    })
  }

  public async mutate<T = unknown>(mutation: string, options?: QueryOptions): Promise<T> {
    return this.handleRequest(async () => {
      const client = this.getClient(options?.headers ? undefined : options?.variables?.token as string)
      if (options?.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          client.setHeader(key, value)
        })
      }
      return await client.request(gql`${mutation}`, options?.variables)
    })
  }

  private async executeQuery(query: string, token?: string): Promise<unknown> {
    return this.handleRequest(async () => {
      const client = this.getClient(token)
      return await client.request(gql`${query}`)
    })
  }

  private async executeMutation(mutation: string, token?: string): Promise<unknown> {
    return this.handleRequest(async () => {
      const client = this.getClient(token)
      return await client.request(gql`${mutation}`)
    })
  }

  public async get<T = unknown>(
    tableName: string,
    options: {
      select: string | string[] | Record<string, unknown>
      where?: WhereClause
      limit?: number
      offset?: number
      orderBy?: OrderByClause | OrderByClause[]
      aggregate?: string
    },
    token?: string,
  ): Promise<T> {
    const { select, where, limit, offset, orderBy, aggregate } = options
    const query = createQuery(tableName, select, where, limit, offset, orderBy, aggregate)
    return this.executeQuery(query, token) as Promise<T>
  }

  public async insert<T = unknown>(
    tableName: string,
    data: Record<string, unknown> | Record<string, unknown>[],
    onConflict: OnConflictClause | null = null,
    returning: string | string[] = 'affected_rows',
    token?: string,
  ): Promise<T> {
    if (Array.isArray(returning)) {
      returning = returning.join(' ')
    }

    const mutation = createInsertMutation(
      tableName,
      data,
      onConflict,
      returning,
    )

    return this.executeMutation(mutation, token) as Promise<T>
  }

  public async update<T = unknown>(
    tableName: string,
    data: Record<string, unknown>,
    where: WhereClause,
    returning: string = 'affected_rows',
    token?: string,
  ): Promise<T> {
    if (!where || Object.keys(where).length === 0) throw new ValidationError('error.whereClauseRequired')
    const mutation = createUpdateMutation(tableName, data, where, returning)
    return this.executeMutation(mutation, token) as Promise<T>
  }

  public async updateMany<T = unknown>(
    tableName: string,
    data: Array<{ data: Record<string, unknown> | Record<string, unknown>[], where: WhereClause }>,
    returning: string = 'affected_rows',
    token?: string,
  ): Promise<T> {
    const mutation = createUpdateManyMutation(tableName, data, returning)
    return this.executeMutation(mutation, token) as Promise<T>
  }

  public async delete<T = unknown>(
    tableName: string,
    where: WhereClause,
    returning: string = 'affected_rows',
    token?: string,
  ): Promise<T> {
    if (!where || Object.keys(where).length === 0) throw new ValidationError('error.whereClauseRequired')
    const mutation = createDeleteMutation(tableName, where, returning)
    return this.executeMutation(mutation, token) as Promise<T>
  }

  public async batch<T = unknown>(
    operations: BatchOperation[],
    token?: string,
  ): Promise<T> {
    if (!operations.length) {
      throw new ValidationError('error.noOperationsBatchProvided')
    }

    const mutation = this.createBatchMutation(operations)
    return this.executeMutation(mutation, token) as Promise<T>
  }
}

export const useGraphQL = (options: Record<string, unknown>): IGraphQLService => {
  const graphqlService = new GraphQLService({
    url: options.url as string,
    debug: options.debug as boolean || false,
    headers: options.headers as Record<string, string> || {},
  })
  return graphqlService
}
