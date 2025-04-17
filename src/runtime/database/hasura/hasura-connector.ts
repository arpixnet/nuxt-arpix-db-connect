import { createClient } from 'graphql-ws'
import type {
  DatabaseInterface,
  QueryOptions,
  SubscriptionOptions,
  WhereClause,
  OrderByClause,
  OnConflictClause,
  BatchOperation,
} from '../interface/database.interface'
import { GraphQLService } from './graphql-service'

/**
 * Options for Hasura connector
 */
export interface HasuraConnectorOptions {
  url: string
  wsUrl?: string
  headers?: Record<string, string>
  debug?: boolean
}

/**
 * Hasura connector implementation
 */
export class HasuraConnector implements DatabaseInterface {
  private graphqlService: GraphQLService
  private wsClient: ReturnType<typeof createClient> | null = null
  private debug: boolean
  private headers: Record<string, string>

  /**
   * Create a new HasuraConnector instance
   * @param options Connector options
   */
  constructor(options: HasuraConnectorOptions) {
    this.debug = options.debug || false
    this.headers = options.headers || {}

    // Initialize GraphQL service for queries and mutations
    this.graphqlService = new GraphQLService(options.url, this.headers, this.debug)

    // Initialize WebSocket client for subscriptions if wsUrl is provided
    if (options.wsUrl && typeof window !== 'undefined') {
      this.wsClient = createClient({
        url: options.wsUrl,
        connectionParams: {
          headers: this.headers,
        },
      })
    }

    if (this.debug) {
      console.log('HasuraConnector initialized with:', {
        url: options.url,
        wsUrl: options.wsUrl,
        headers: Object.keys(this.headers),
      })
    }
  }

  /**
   * Execute a raw GraphQL query
   */
  async query<T = unknown>(query: string, options?: QueryOptions): Promise<T> {
    if (options?.headers) {
      // Merge headers for this specific request
      const mergedHeaders = { ...this.headers, ...options.headers }
      this.graphqlService.setHeaders(mergedHeaders)
    }

    return this.graphqlService.query<T>(query, options?.variables)
  }

  /**
   * Execute a raw GraphQL mutation
   */
  async mutate<T = unknown>(mutation: string, options?: QueryOptions): Promise<T> {
    if (options?.headers) {
      // Merge headers for this specific request
      const mergedHeaders = { ...this.headers, ...options.headers }
      this.graphqlService.setHeaders(mergedHeaders)
    }

    return this.graphqlService.mutate<T>(mutation, options?.variables)
  }

  /**
   * Get data from a table
   */
  async get<T = unknown>(
    tableName: string,
    options: {
      select: string | string[] | Record<string, unknown>
      where?: WhereClause
      limit?: number
      offset?: number
      orderBy?: OrderByClause | OrderByClause[]
      aggregate?: string
    },
  ): Promise<T> {
    return this.graphqlService.get<T>(tableName, options)
  }

  /**
   * Insert data into a table
   */
  async insert<T = unknown>(
    tableName: string,
    data: Record<string, unknown> | Record<string, unknown>[],
    onConflict: OnConflictClause | null = null,
    returning: string | string[] = 'affected_rows',
  ): Promise<T> {
    return this.graphqlService.insert<T>(tableName, data, onConflict, returning)
  }

  /**
   * Update data in a table
   */
  async update<T = unknown>(
    tableName: string,
    data: Record<string, unknown>,
    where: WhereClause,
    returning: string | string[] = 'affected_rows',
  ): Promise<T> {
    return this.graphqlService.update<T>(tableName, data, where, returning)
  }

  /**
   * Update multiple records in a table
   */
  async updateMany<T = unknown>(
    tableName: string,
    data: Array<{ data: Record<string, unknown>, where: WhereClause }>,
    returning: string | string[] = 'affected_rows',
  ): Promise<T> {
    return this.graphqlService.updateMany<T>(tableName, data, returning)
  }

  /**
   * Delete data from a table
   */
  async delete<T = unknown>(
    tableName: string,
    where: WhereClause,
    returning: string | string[] = 'affected_rows',
  ): Promise<T> {
    return this.graphqlService.delete<T>(tableName, where, returning)
  }

  /**
   * Execute a batch of operations
   */
  async batch<T = unknown>(operations: BatchOperation[]): Promise<T> {
    return this.graphqlService.batch<T>(operations)
  }

  /**
   * Subscribe to a GraphQL subscription
   */
  subscribe<T = unknown>(subscription: string, options?: SubscriptionOptions) {
    if (!this.wsClient) {
      throw new Error('WebSocket client not initialized. Please provide wsUrl in the options.')
    }

    if (this.debug) {
      console.log('HasuraConnector subscription:', subscription, options?.variables)
    }

    const unsubscribe = this.wsClient.subscribe(
      {
        query: subscription,
        variables: options?.variables || {},
      },
      {
        next: (data: { data: T }) => {
          if (this.debug) {
            console.log('HasuraConnector subscription data:', data)
          }
          options?.onData?.(data.data)
        },
        error: (error: unknown) => {
          if (this.debug) {
            console.error('HasuraConnector subscription error:', error)
          }
          options?.onError?.(error)
        },
        complete: () => {
          if (this.debug) {
            console.log('HasuraConnector subscription completed')
          }
        },
      },
    )

    return {
      unsubscribe: () => {
        if (this.debug) {
          console.log('HasuraConnector unsubscribing')
        }
        unsubscribe()
      },
    }
  }

  /**
   * Set headers for all subsequent requests
   */
  setHeaders(headers: Record<string, string>): void {
    this.headers = headers
    this.graphqlService.setHeaders(headers)
  }

  /**
   * Add a single header for all subsequent requests
   */
  setHeader(key: string, value: string): void {
    this.headers[key] = value
    this.graphqlService.setHeader(key, value)
  }
}
