import * as dbConnect from '../database'
import { useRuntimeConfig } from '#imports'

export function useDbConnector(): dbConnect.IGraphQLService {
  return dbConnect.DatabaseFactory.createConnector(useRuntimeConfig().dbConnect) as dbConnect.IGraphQLService
}
