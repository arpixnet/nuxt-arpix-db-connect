import { GraphQLClient, gql } from 'graphql-request';
import { 
  WhereClause, 
  OrderByClause, 
  OnConflictClause, 
  BatchOperation 
} from '../interface/database.interface';

/**
 * GraphQL Service Error class
 */
export class GraphQLServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphQLServiceError';
  }
}

/**
 * Network Error class
 */
export class NetworkError extends GraphQLServiceError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * GraphQL Error class
 */
export class GraphQLError extends GraphQLServiceError {
  details?: unknown;

  constructor(message: string) {
    super(message);
    this.name = 'GraphQLError';
  }
}

/**
 * Validation Error class
 */
export class ValidationError extends GraphQLServiceError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Permission Denied Error class
 */
export class PermissionDeniedError extends GraphQLServiceError {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

/**
 * GraphQL Service class for interacting with GraphQL APIs
 */
export class GraphQLService {
  private client: GraphQLClient;
  private debug: boolean;
  private headers: Record<string, string>;

  /**
   * Create a new GraphQLService instance
   * @param url GraphQL endpoint URL
   * @param headers Optional headers to include in all requests
   * @param debug Whether to enable debug logging
   */
  constructor(url: string, headers: Record<string, string> = {}, debug: boolean = false) {
    this.headers = { ...headers };
    this.client = new GraphQLClient(url, { headers: this.headers });
    this.debug = debug;

    if (this.debug) {
      console.log('GraphQLService initialized with:', {
        url,
        headers: Object.keys(headers),
      });
    }
  }

  /**
   * Set headers for the GraphQL client
   * @param headers Headers to set
   */
  setHeaders(headers: Record<string, string>): void {
    this.headers = { ...headers };
    this.client.setHeaders(this.headers);
  }

  /**
   * Add a single header to the GraphQL client
   * @param key Header key
   * @param value Header value
   */
  setHeader(key: string, value: string): void {
    this.headers[key] = value;
    this.client.setHeader(key, value);
  }

  /**
   * Get the GraphQL client with optional token
   * @param token Optional authentication token
   * @returns GraphQL client
   */
  getClient(token?: string): GraphQLClient {
    if (token) {
      const headers = { ...this.headers, Authorization: `Bearer ${token}` };
      return new GraphQLClient(this.client.url, { headers });
    }
    return this.client;
  }

  /**
   * Handle GraphQL request errors
   * @param requestFn Function that makes the GraphQL request
   * @returns The result of the request
   */
  private async handleRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    try {
      const result = await requestFn();
      if (this.debug) {
        console.log('GraphQL operation successful:', result);
      }
      return result;
    } catch (error: unknown) {
      if (this.debug) {
        console.error('GraphQL operation failed:', error);
      }

      // Network error
      if (error instanceof Error && error.message.includes('Network')) {
        throw new NetworkError('Network error occurred');
      }

      // GraphQL error
      if (typeof error === 'object' && error !== null && 'response' in error && 
          error.response && typeof error.response === 'object' && 'errors' in error.response) {
        const gqlError = error.response.errors?.[0];
        
        if (typeof gqlError === 'object' && gqlError !== null) {
          // Check for permission errors
          if ('extensions' in gqlError && typeof gqlError.extensions === 'object' && gqlError.extensions !== null) {
            const extensions = gqlError.extensions;
            if ('code' in extensions) {
              const code = extensions.code;
              if (code === 'permission-denied') {
                throw new PermissionDeniedError('Permission denied');
              }
              if (code === 'invalid-jwt') {
                throw new PermissionDeniedError('Invalid authentication token');
              }
            }
          }

          // Get error message
          const message = 'message' in gqlError && typeof gqlError.message === 'string'
            ? gqlError.message
            : 'GraphQL operation failed';
          
          const graphqlError = new GraphQLError(message);
          graphqlError.details = gqlError;
          throw graphqlError;
        }
        
        throw new GraphQLError('GraphQL operation failed');
      }

      // Validation error
      if (error instanceof GraphQLServiceError) {
        throw error;
      }

      // Unexpected error
      const errorMessage = typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : 'Unexpected error';
      
      throw new GraphQLServiceError(errorMessage);
    }
  }

  /**
   * Execute a raw GraphQL query
   * @param query GraphQL query string
   * @param variables Optional variables for the query
   * @returns Query result
   */
  async query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
    if (this.debug) {
      console.log('GraphQL query:', query, variables);
    }

    return this.handleRequest(async () => {
      const result = await this.client.request<T>(gql`${query}`, variables);
      
      if (this.debug) {
        console.log('GraphQL query result:', result);
      }
      
      return result;
    });
  }

  /**
   * Execute a raw GraphQL mutation
   * @param mutation GraphQL mutation string
   * @param variables Optional variables for the mutation
   * @returns Mutation result
   */
  async mutate<T = unknown>(mutation: string, variables?: Record<string, unknown>): Promise<T> {
    if (this.debug) {
      console.log('GraphQL mutation:', mutation, variables);
    }

    return this.handleRequest(async () => {
      const result = await this.client.request<T>(gql`${mutation}`, variables);
      
      if (this.debug) {
        console.log('GraphQL mutation result:', result);
      }
      
      return result;
    });
  }

  /**
   * Get data from a table
   * @param tableName Table name
   * @param options Query options
   * @param options.select Fields to select (string, array of strings, or object)
   * @param options.where Where clause for filtering
   * @param options.limit Maximum number of records to return
   * @param options.offset Number of records to skip
   * @param options.orderBy Order by clause
   * @param options.aggregate Aggregate function to apply
   * @returns Query result
   */
  async get<T = unknown>(
    tableName: string,
    options: {
      select: string | string[] | Record<string, unknown>;
      where?: WhereClause;
      limit?: number;
      offset?: number;
      orderBy?: OrderByClause | OrderByClause[];
      aggregate?: string;
    },
  ): Promise<T> {
    const { select, where, limit, offset, orderBy, aggregate } = options;
    
    // Convert select to string if it's an array
    let selectStr = select;
    if (Array.isArray(select)) {
      selectStr = select.join(' ');
    } else if (typeof select === 'object') {
      selectStr = this.objectToGraphQLSelection(select);
    }

    // Build the query
    let query = `query {
      ${tableName}`;

    // Add where clause
    if (where) {
      query += `(where: ${this.objectToGraphQLParams(where)})`;
    }

    // Add limit
    if (limit !== undefined) {
      query += `${where ? '' : '('}limit: ${limit}${where ? '' : ')'}`
    }

    // Add offset
    if (offset !== undefined) {
      query += `${where || limit ? '' : '('}offset: ${offset}${where || limit ? '' : ')'}`
    }

    // Add order by
    if (orderBy) {
      const orderByStr = Array.isArray(orderBy)
        ? `[${orderBy.map(o => this.objectToGraphQLParams(o)).join(', ')}]`
        : this.objectToGraphQLParams(orderBy);
      
      query += `${where || limit || offset ? '' : '('}order_by: ${orderByStr}${where || limit || offset ? '' : ')'}`
    }

    // Close parameters if needed
    if ((where && (limit || offset || orderBy)) || 
        (!where && limit && (offset || orderBy)) || 
        (!where && !limit && offset && orderBy)) {
      query += ')';
    }

    // Add selection
    if (aggregate) {
      query += ` {
        aggregate {
          ${aggregate}
        }
      }`;
    } else {
      query += ` {
        ${selectStr}
      }`;
    }

    // Close the query
    query += `
    }`;

    return this.query<T>(query);
  }

  /**
   * Insert data into a table
   * @param tableName Table name
   * @param data Data to insert (object or array of objects)
   * @param onConflict On conflict clause
   * @param returning Fields to return
   * @returns Mutation result
   */
  async insert<T = unknown>(
    tableName: string,
    data: Record<string, unknown> | Record<string, unknown>[],
    onConflict: OnConflictClause | null = null,
    returning: string | string[] = 'affected_rows',
  ): Promise<T> {
    // Validate data
    if (!data) {
      throw new ValidationError('Data is required for insert operation');
    }

    // Convert returning to string if it's an array
    if (Array.isArray(returning)) {
      returning = returning.join(' ');
    }

    // Build the mutation
    let mutation = `mutation {
      insert_${tableName}(`;
    
    // Add objects
    mutation += `objects: ${this.objectToGraphQLParams(Array.isArray(data) ? data : [data])}`;
    
    // Add on_conflict
    if (onConflict) {
      mutation += `, on_conflict: {
        constraint: ${onConflict.constraint},
        update_columns: [${onConflict.update_columns.map(c => c).join(', ')}]`;
      
      if (onConflict.where) {
        mutation += `,
        where: ${this.objectToGraphQLParams(onConflict.where)}`;
      }
      
      mutation += `
      }`;
    }
    
    // Close parameters and add returning
    mutation += `) {
      ${returning}
    }
    }`;

    return this.mutate<T>(mutation);
  }

  /**
   * Update data in a table
   * @param tableName Table name
   * @param data Data to update
   * @param where Where clause
   * @param returning Fields to return
   * @returns Mutation result
   */
  async update<T = unknown>(
    tableName: string,
    data: Record<string, unknown>,
    where: WhereClause,
    returning: string | string[] = 'affected_rows',
  ): Promise<T> {
    // Validate data and where
    if (!data || Object.keys(data).length === 0) {
      throw new ValidationError('Data is required for update operation');
    }
    
    if (!where || Object.keys(where).length === 0) {
      throw new ValidationError('Where clause is required for update operation');
    }

    // Convert returning to string if it's an array
    if (Array.isArray(returning)) {
      returning = returning.join(' ');
    }

    // Build the mutation
    const mutation = `mutation {
      update_${tableName}(
        _set: ${this.objectToGraphQLParams(data)},
        where: ${this.objectToGraphQLParams(where)}
      ) {
        ${returning}
      }
    }`;

    return this.mutate<T>(mutation);
  }

  /**
   * Update multiple records in a table
   * @param tableName Table name
   * @param data Array of objects with data and where clause
   * @param returning Fields to return
   * @returns Mutation result
   */
  async updateMany<T = unknown>(
    tableName: string,
    data: Array<{ data: Record<string, unknown>, where: WhereClause }>,
    returning: string | string[] = 'affected_rows',
  ): Promise<T> {
    // Validate data
    if (!data || data.length === 0) {
      throw new ValidationError('Data is required for updateMany operation');
    }

    // Convert returning to string if it's an array
    if (Array.isArray(returning)) {
      returning = returning.join(' ');
    }

    // Create batch operations
    const operations: BatchOperation[] = data.map((item, index) => ({
      type: 'update',
      table: tableName,
      data: item.data,
      where: item.where,
      returning,
      alias: `update_${index}`,
    }));

    return this.batch<T>(operations);
  }

  /**
   * Delete data from a table
   * @param tableName Table name
   * @param where Where clause
   * @param returning Fields to return
   * @returns Mutation result
   */
  async delete<T = unknown>(
    tableName: string,
    where: WhereClause,
    returning: string | string[] = 'affected_rows',
  ): Promise<T> {
    // Validate where
    if (!where || Object.keys(where).length === 0) {
      throw new ValidationError('Where clause is required for delete operation');
    }

    // Convert returning to string if it's an array
    if (Array.isArray(returning)) {
      returning = returning.join(' ');
    }

    // Build the mutation
    const mutation = `mutation {
      delete_${tableName}(
        where: ${this.objectToGraphQLParams(where)}
      ) {
        ${returning}
      }
    }`;

    return this.mutate<T>(mutation);
  }

  /**
   * Execute a batch of operations
   * @param operations Array of operations
   * @returns Batch result
   */
  async batch<T = unknown>(operations: BatchOperation[]): Promise<T> {
    if (!operations.length) {
      throw new ValidationError('No operations provided for batch');
    }

    const mutations = operations.map((op) => {
      const alias = op.alias || `${op.type}_${op.table}`;
      
      switch (op.type) {
        case 'insert':
          return `
            ${alias}: insert_${op.table}(
              objects: ${this.objectToGraphQLParams(Array.isArray(op.data) ? op.data : [op.data])},
              ${op.onConflict 
                ? `on_conflict: {
                    constraint: ${op.onConflict.constraint},
                    update_columns: [${op.onConflict.update_columns.map(c => c).join(', ')}]
                    ${op.onConflict.where ? `, where: ${this.objectToGraphQLParams(op.onConflict.where)}` : ''}
                  }` 
                : ''}
            ) {
              ${op.returning || 'affected_rows'}
            }
          `;
        case 'update':
          return `
            ${alias}: update_${op.table}(
              _set: ${this.objectToGraphQLParams(op.data)},
              where: ${this.objectToGraphQLParams(op.where)}
            ) {
              ${op.returning || 'affected_rows'}
            }
          `;
        case 'delete':
          return `
            ${alias}: delete_${op.table}(
              where: ${this.objectToGraphQLParams(op.where)}
            ) {
              ${op.returning || 'affected_rows'}
            }
          `;
        default:
          throw new ValidationError('Invalid operation type');
      }
    });

    return this.mutate<T>(`mutation { ${mutations.join('\n')} }`);
  }

  /**
   * Convert an object to GraphQL parameters format
   * @param obj Object to convert
   * @returns GraphQL parameters string
   */
  private objectToGraphQLParams(obj: unknown): string {
    if (obj === null || obj === undefined) {
      return 'null';
    }

    if (typeof obj !== 'object') {
      return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
      return `[${obj.map(item => this.objectToGraphQLParams(item)).join(', ')}]`;
    }

    const entries = Object.entries(obj as Record<string, unknown>).map(([key, value]) => {
      // Handle special operators
      if (key.startsWith('_')) {
        return `${key}: ${this.objectToGraphQLParams(value)}`;
      }
      
      return `${key}: ${this.objectToGraphQLParams(value)}`;
    });

    return `{${entries.join(', ')}}`;
  }

  /**
   * Convert an object to GraphQL selection format
   * @param obj Object to convert
   * @returns GraphQL selection string
   */
  private objectToGraphQLSelection(obj: Record<string, unknown>): string {
    return Object.entries(obj).map(([key, value]) => {
      if (value === true) {
        return key;
      }
      
      if (typeof value === 'object' && value !== null) {
        return `${key} { ${this.objectToGraphQLSelection(value as Record<string, unknown>)} }`;
      }
      
      return '';
    }).filter(Boolean).join(' ');
  }
}
