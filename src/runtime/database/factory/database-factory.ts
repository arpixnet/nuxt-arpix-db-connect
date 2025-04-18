import type { DBConnectOptions } from '../interface/database.interface'
import { useGraphQL } from '../hasura/graphql-service'

/**
 * Factory class for creating database connectors
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DatabaseFactory {
  /**
   * Create a database connector based on the provided options
   * @param options Database connection options
   * @returns Database connector instance
   */
  static createConnector(options: DBConnectOptions) {
    const { dataOrigin, dataDebug } = options

    // Currently only Hasura is supported
    if (dataOrigin === 'hasura') {
      if (!options.hasura?.url) {
        throw new Error('Hasura URL is required when using Hasura as data origin')
      }
      return useGraphQL({
        url: options.hasura.url,
        wsUrl: options.hasura.wsUrl,
        headers: options.hasura.headers,
        debug: dataDebug,
      })
    }

    // For future integrations
    throw new Error(`Unsupported data origin: ${dataOrigin}. Currently only 'hasura' is supported.`)
  }
}
