import * as dbConnect from '../database'
import { useRuntimeConfig } from '#imports'

export function useDbConnector() {
  const config = useRuntimeConfig().dbConnect
  const connector = dbConnect.DatabaseFactory.createConnector(config)

  // Currently only Hasura is supported
  return connector as dbConnect.IGraphQLService
}
