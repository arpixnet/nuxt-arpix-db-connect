import { defineNuxtModule, addPlugin, addServerImportsDir, createResolver } from '@nuxt/kit'

const MODULE_NAME = 'nuxt-arpix-db-connect'
const CONFIG_KEY = 'dbConnect'

// Hasura specific options
export interface HasuraOptions {
  url: string
  wsUrl?: string
  headers?: Record<string, string>
}

// Interface for future database connectors
export interface GenericConnectorOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

// Module options TypeScript interface definition
export interface ModuleOptions {
  dataOrigin: 'hasura' | string
  hasura?: HasuraOptions
  // Space for future integrations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
  dataDebug?: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: CONFIG_KEY,
    compatibility: {
      nuxt: '^3.0.0 || ^4.0.0',
    },
  },
  // Default configuration options of the Nuxt module
  defaults: {
    dataOrigin: 'hasura',
    dataDebug: false,
    hasura: {
      url: 'http://localhost:8080/v1/graphql',
    },
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // 1. Validate essential configuration
    if (!options?.dataOrigin) {
      throw new Error('dataOrigin is required when using the database connector')
    }

    // Validate Hasura configuration if selected
    if (options.dataOrigin === 'hasura' && !options.hasura?.url) {
      throw new Error('Hasura URL is required when using Hasura as data origin')
    }

    // 2. Make options available in runtime
    nuxt.options.runtimeConfig[CONFIG_KEY] = options

    // 3. Add server utilities directory for auto-import
    // This will make `useDBConnector` available in server/api, server/routes, etc.
    const runtimeDir = resolver.resolve('./runtime/utils')
    addServerImportsDir(runtimeDir)

    console.log(`[${MODULE_NAME}] Module set up with data origin: ${options.dataOrigin}`)

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin'))
  },
})
