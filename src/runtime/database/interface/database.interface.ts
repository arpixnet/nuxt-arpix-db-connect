/**
 * Interface for database operations
 * This interface defines the common operations that all database connectors should implement
 */
export interface DatabaseInterface {
  /**
   * Execute a raw GraphQL query
   * @param query GraphQL query string
   * @param variables Optional variables for the query
   * @param headers Optional headers for the request
   * @returns Query result
   */
  query<T = unknown>(query: string, options?: QueryOptions): Promise<T>

  /**
   * Execute a raw GraphQL mutation
   * @param mutation GraphQL mutation string
   * @param variables Optional variables for the mutation
   * @param headers Optional headers for the request
   * @returns Mutation result
   */
  mutate<T = unknown>(mutation: string, options?: QueryOptions): Promise<T>

  /**
   * Subscribe to a GraphQL subscription (if supported)
   * @param subscription GraphQL subscription string
   * @param options Subscription options
   * @returns Subscription object with unsubscribe method
   */
  subscribe?(subscription: string, options?: SubscriptionOptions): { unsubscribe: () => void }

  /**
   * Get data from a table
   * @param tableName Table name
   * @param options Query options
   * @returns Query result
   */
  get?<T = unknown>(
    tableName: string,
    options: {
      select: string | string[] | Record<string, unknown>
      where?: WhereClause
      limit?: number
      offset?: number
      orderBy?: OrderByClause | OrderByClause[]
      aggregate?: string
    }
  ): Promise<T>

  /**
   * Insert data into a table
   * @param tableName Table name
   * @param data Data to insert (object or array of objects)
   * @param onConflict On conflict clause
   * @param returning Fields to return
   * @returns Mutation result
   */
  insert?<T = unknown>(
    tableName: string,
    data: Record<string, unknown> | Record<string, unknown>[],
    onConflict?: OnConflictClause | null,
    returning?: string | string[]
  ): Promise<T>

  /**
   * Update data in a table
   * @param tableName Table name
   * @param data Data to update
   * @param where Where clause
   * @param returning Fields to return
   * @returns Mutation result
   */
  update?<T = unknown>(
    tableName: string,
    data: Record<string, unknown>,
    where: WhereClause,
    returning?: string | string[]
  ): Promise<T>

  /**
   * Update multiple records in a table
   * @param tableName Table name
   * @param data Array of objects with data and where clause
   * @param returning Fields to return
   * @returns Mutation result
   */
  updateMany?<T = unknown>(
    tableName: string,
    data: Array<{ data: Record<string, unknown> | Record<string, unknown>[], where: WhereClause }>,
    returning?: string | string[]
  ): Promise<T>

  /**
   * Delete data from a table
   * @param tableName Table name
   * @param where Where clause
   * @param returning Fields to return
   * @returns Mutation result
   */
  delete?<T = unknown>(
    tableName: string,
    where: WhereClause,
    returning?: string | string[]
  ): Promise<T>

  /**
   * Execute a batch of operations
   * @param operations Array of operations
   * @returns Batch result
   */
  batch?<T = unknown>(operations: BatchOperation[]): Promise<T>

  /**
   * Set headers for all subsequent requests
   * @param headers Headers to set
   */
  setHeaders?(headers: Record<string, string>): void

  /**
   * Add a single header for all subsequent requests
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
  constraint: string
  update_columns: string[]
  where?: WhereClause
}

/**
 * Interface for batch operations
 */
export interface BatchOperation {
  type: 'insert' | 'update' | 'delete'
  table: string
  data?: Record<string, unknown> | Record<string, unknown>[]
  where?: WhereClause
  onConflict?: OnConflictClause
  returning?: string
  alias?: string
}

/**
 * Options for database connection
 */
export interface DBConnectOptions {
  dataOrigin: 'hasura' | 'prisma'
  hasura?: {
    url: string
    wsUrl?: string
    headers?: Record<string, string>
  }
  prisma?: Record<string, unknown>
  dataDebug?: boolean
  metaData?: Record<string, unknown>
}
