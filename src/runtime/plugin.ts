import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { DatabaseFactory, DatabaseInterface, DBConnectOptions } from './database'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const options = config.public.dbConnect as DBConnectOptions

  // Create the appropriate connector based on configuration
  const connector: DatabaseInterface = DatabaseFactory.createConnector(options)

  if (options.dataDebug) {
    console.log('DB Connect plugin initialized with options:', options)
  }

  // Provide the connector to the app
  nuxtApp.provide('dbConnect', connector)

  return {
    provide: {
      dbConnect: connector
    }
  }
})
