/**
 * Interface for database operations
 * This interface defines the common operations that all database connectors should implement
 */

export interface DatabaseInterface {
  /**
   * Execute a raw GraphQL query
   * @param query GraphQL query string
   * @param options Optional query options including variables and headers
   * @returns Query result
   */
  query<T = unknown>(query: string, options?: QueryOptions): Promise<T>

  /**
   * Execute a raw GraphQL mutation
   * @param mutation GraphQL mutation string
   * @param options Optional query options including variables and headers
   * @returns Mutation result
   */
  mutate<T = unknown>(mutation: string, options?: QueryOptions): Promise<T>

  /**
   * Get data from a table (GraphQL and Prisma)
   * @param tableName Table name
   * @param options Query options
   * @param options.select Fields to select
   * @param options.where Optional where conditions
   * @param options.limit Optional limit for results
   * @param options.offset Optional offset for pagination
   * @param options.orderBy Optional ordering
   * @param options.aggregate Optional aggregation functions
   * @param token Optional authentication token (for GraphQL)
   * @returns Query result
   */
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

  /**
   * Insert data into a table (GraphQL and Prisma)
   * @param tableName Table name
   * @param data Data to insert (object or array of objects)
   * @param onConflict On conflict clause (for GraphQL)
   * @param returning Fields to return (for GraphQL)
   * @param token Optional authentication token (for GraphQL)
   * @returns Mutation result
   */
  insert<T = unknown>(
    tableName: string,
    data: Record<string, unknown> | Record<string, unknown>[],
    onConflict?: OnConflictClause | null,
    returning?: string | string[],
    token?: string
  ): Promise<T>

  /**
   * Update data in a table (GraphQL and Prisma)
   * @param tableName Table name
   * @param data Data to update
   * @param where Where clause
   * @param returning Fields to return (for GraphQL)
   * @param token Optional authentication token (for GraphQL)
   * @returns Mutation result
   */
  update<T = unknown>(
    tableName: string,
    data: Record<string, unknown>,
    where: WhereClause,
    returning?: string | string[],
    token?: string
  ): Promise<T>

  /**
   * Delete data from a table (GraphQL and Prisma)
   * @param tableName Table name
   * @param where Where clause
   * @param returning Fields to return (for GraphQL)
   * @param token Optional authentication token (for GraphQL)
   * @returns Mutation result
   */
  delete<T = unknown>(
    tableName: string,
    where: WhereClause,
    returning?: string | string[],
    token?: string
  ): Promise<T>

  /**
   * GraphQL-specific methods below
   */

  /**
   * Update multiple records in a table (GraphQL only)
   * @param tableName Table name
   * @param data Array of objects with data and where clause
   * @param returning Fields to return
   * @param token Optional authentication token
   * @returns Mutation result
   */
  updateMany?<T = unknown>(
    tableName: string,
    data: Array<{ data: Record<string, unknown> | Record<string, unknown>[], where: WhereClause }>,
    returning?: string | string[],
    token?: string
  ): Promise<T>

  /**
   * Execute a batch of operations (GraphQL only)
   * @param operations Array of operations
   * @param token Optional authentication token
   * @returns Batch result
   */
  batch?<T = unknown>(operations: BatchOperation[], token?: string): Promise<T>

  /**
   * Get GraphQL client with optional authentication token (GraphQL only)
   * @param token Optional authentication token
   * @returns GraphQL client instance
   */
  getClient?(token?: string): unknown

  /**
   * Subscribe to a GraphQL subscription (GraphQL only, if supported)
   * @param subscription GraphQL subscription string
   * @param options Subscription options
   * @returns Subscription object with unsubscribe method
   */
  subscribe?(subscription: string, options?: SubscriptionOptions): { unsubscribe: () => void }

  /**
   * Set headers for all subsequent requests (GraphQL only)
   * @param headers Headers to set
   */
  setHeaders?(headers: Record<string, string>): void

  /**
   * Add a single header for all subsequent requests (GraphQL only)
   * @param key Header key
   * @param value Header value
   */
  setHeader?(key: string, value: string): void
}

/**
 * Options for query operations
 */
export interface QueryOptions {
  variables?: Record<string, unknown>
  headers?: Record<string, string>
}

/**
 * Options for subscription operations
 */
export interface SubscriptionOptions extends QueryOptions {
  onData?: (data: unknown) => void
  onError?: (error: unknown) => void
}

/**
 * Interface for where clauses in GraphQL queries
 */
export interface WhereClause {
  [key: string]: unknown
  _and?: WhereClause[]
  _or?: WhereClause[]
  _not?: WhereClause[]
  _eq?: unknown
  _neq?: unknown
  _gt?: unknown
  _lt?: unknown
  _gte?: unknown
  _lte?: unknown
  _in?: unknown[]
  _nin?: unknown[]
  _like?: string
  _ilike?: string
  _is_null?: boolean
}

/**
 * Interface for order by clauses in GraphQL queries
 */
export interface OrderByClause {
  [key: string]: 'asc' | 'desc' | 'asc_nulls_first' | 'asc_nulls_last' | 'desc_nulls_first' | 'desc_nulls_last'
}

/**
 * Interface for on conflict clauses in GraphQL mutations
 */
export interface OnConflictClause {
  constraint?: string
  update_columns: string[]
  where?: WhereClause
}

/**
 * Type for batch operations
 */
export type BatchOperation =
  | {
    type: 'insert'
    table: string
    data: Record<string, unknown> | Record<string, unknown>[]
    onConflict?: OnConflictClause | null
    returning?: string
    alias?: string
  }
  | {
    type: 'update'
    table: string
    data: Record<string, unknown>
    where: WhereClause
    returning?: string
    alias?: string
  }
  | {
    type: 'delete'
    table: string
    where: WhereClause
    returning?: string
    alias?: string
  }

/**
 * Options for database connection
 */
export interface DBConnectOptions {
  dataOrigin: 'hasura' | string
  hasura?: {
    url: string
    wsUrl?: string
    headers?: Record<string, string>
  }
  // Space for future integrations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
  dataDebug?: boolean
  metaData?: Record<string, unknown>
}
