import * as dbConnect from '../database'
import { useRuntimeConfig } from '#imports'

export function useDbConnector() {
  const config = useRuntimeConfig().dbConnect
  const connector = dbConnect.DatabaseFactory.createConnector(config)

  if (config.dataOrigin === 'hasura') {
    return connector as dbConnect.IGraphQLService
  }
  return connector as dbConnect.DatabaseInterface
}
