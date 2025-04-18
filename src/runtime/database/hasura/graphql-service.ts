import { GraphQLClient, gql } from 'graphql-request'

export interface IGraphQLService {
    get: typeof GraphQLService.prototype.get
    insert: typeof GraphQLService.prototype.insert
    update: typeof GraphQLService.prototype.update
    updateMany: typeof GraphQLService.prototype.updateMany
    delete: typeof GraphQLService.prototype.delete
    batch: typeof GraphQLService.prototype.batch // En prueba de implementación
    getClient: typeof GraphQLService.prototype.getClient
}

interface WhereClause {
    [key: string]: any
    _and?: WhereClause[]
    _or?: WhereClause[]
    _not?: WhereClause[]
}

type BatchOperation =
  | {
      type: 'insert'
      table: string
      data: any
      onConflict?: any
      returning?: string
    }
  | {
      type: 'update'
      table: string
      data: any
      where: any
      returning?: string
    }
  | {
      type: 'delete'
      table: string
      where: any
      returning?: string
    }

const createQuery = (
    tableName: string,
    select: string,
    where: WhereClause | null = null,
    limit: number | null = null,
    offset: number | null = null,
    orderBy: any = null,
    aggregate: any = null
): string => {
    const args = []
    if (where) args.push(`where: ${JSON.stringify(where).replace(/"([^"]+)":/g, '$1:')}`)
    if (limit) args.push(`limit: ${limit}`)
    if (offset) args.push(`offset: ${offset}`)
    if (orderBy) args.push(`order_by: ${JSON.stringify(orderBy).replace(/"([^"]+)":\s*"([^"]+)"/g, '$1: $2')}`)

    let fields = `${tableName}${args.length ? `(${args.join(", ")})` : ''} { ${select} }`

    if (aggregate) {
        fields += `
            ${tableName}_aggregate${args.length ? `(${args.join(", ")})` : ''} {
                ${aggregate}
            }
        `
    }

    return `query { ${fields} }`
}

const createInsertMutation = (
    tableName: string,
    data: any,
    onConflict: any = null,
    returning: string = 'affected_rows'
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
            insert_${tableName}(${args.join(", ")}) {
                ${returning}
            }
        }
    `
}

const createUpdateMutation = (
    tableName: string,
    data: any,
    where: WhereClause,
    returning: string = 'affected_rows'
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
    updates: { where: WhereClause; _set: any }[],
    returning: string = 'affected_rows',
): string => {
    const updatesFormatted = updates.map(update => `{
        where: ${JSON.stringify(update.where).replace(/"([^\"]+)":/g, '$1:')},
        _set: ${JSON.stringify(update._set).replace(/"([^\"]+)":/g, '$1:')}
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
    details: any

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

class GraphQLService {
    private url: string
    private debug: boolean

    constructor(url: string, debug: boolean = false) {
        this.url = url
        this.debug = debug
    }

    getClient(token?: string): GraphQLClient {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
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
        } catch (error: any) {
            if (this.debug) console.error('Operation failed:', error)

            // Network error
            if (error instanceof Error && error.message.includes('Network')) {
                throw new NetworkError('error.networkError')
            }

            // GraphQL error
            if (error?.response?.errors) {
                const firstError = error.response.errors[0]

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

    private async query(query: string, token?: string): Promise<any> {
        return this.handleRequest(async () => {
            const client = this.getClient(token)
            return await client.request(gql`${query}`)
        })
    }

    private async mutate(mutation: string, token?: string): Promise<any> {
        return this.handleRequest(async () => {
            const client = this.getClient(token)
            return await client.request(gql`${mutation}`)
        })
    }

    public async get(
        tableName: string,
        options: {
            select: any
            where?: WhereClause
            limit?: number
            offset?: number
            orderBy?: any
            aggregate?: any
        },
        token?: string
    ): Promise<any> {
        const { select, where, limit, offset, orderBy, aggregate } = options
        const query = createQuery(tableName, select, where, limit, offset, orderBy, aggregate)
        return this.query(query, token)
    }

    public async insert(
        tableName: string,
        data: any,
        onConflict: any = null,
        returning: string | string[] = 'affected_rows',
        token?: string
    ): Promise<any> {
        if (Array.isArray(returning)) {
            returning = returning.join(' ')
        }

        const mutation = createInsertMutation(
            tableName,
            data,
            onConflict,
            returning
        )

        return this.mutate(mutation, token)
    }

    public async update(
        tableName: string,
        data: any,
        where: WhereClause,
        returning: string = 'affected_rows',
        token?: string
    ): Promise<any> {
        if (!where || Object.keys(where).length === 0) throw new ValidationError('error.whereClauseRequired')
        const mutation = createUpdateMutation(tableName, data, where, returning)
        return this.mutate(mutation, token)
    }

    public async updateMany(
        tableName: string,
        data: any,
        returning: string = 'affected_rows',
        token?: string
    ): Promise<any> {
        const mutation = createUpdateManyMutation(tableName, data, returning)
        return this.mutate(mutation, token)
    }

    public async delete(
        tableName: string,
        where: WhereClause,
        returning: string = 'affected_rows',
        token?: string
    ): Promise<any> {
        if (!where || Object.keys(where).length === 0) throw new ValidationError('error.whereClauseRequired')
        const mutation = createDeleteMutation(tableName, where, returning)
        return this.mutate(mutation, token)
    }

    public async batch(
        operations: BatchOperation[],
        token?: string
    ): Promise<Record<string, any>> {
        if (!operations.length) {
            throw new ValidationError('error.noOperationsBatchProvided')
        }

        const mutation = this.createBatchMutation(operations)
        return this.mutate(mutation, token)
    }
}

export const useGraphQL = (options: any): IGraphQLService => {
    const graphqlService: IGraphQLService = new GraphQLService(options.url, options.debug || false)
    return graphqlService
}
