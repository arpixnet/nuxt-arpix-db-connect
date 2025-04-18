import { defineNuxtModule, addPlugin, addServerImportsDir, createResolver } from '@nuxt/kit'

const MODULE_NAME = 'nuxt-arpix-db-connect'
const CONFIG_KEY = 'dbConnect'

// Hasura specific options
export interface HasuraOptions {
  url: string
  wsUrl?: string
  headers?: Record<string, string>
}

// Prisma specific options
export interface PrismaOptions {
  databaseUrl?: string
  clientOptions?: Record<string, unknown>
}

// Module options TypeScript interface definition
export interface ModuleOptions {
  dataOrigin: 'hasura' | 'prisma'
  hasura?: HasuraOptions
  prisma?: PrismaOptions
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
    hasura: undefined,
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // 1. Validate essential configuration
    if (!options?.dataOrigin) {
      throw new Error('Configuration is required when using Hasura or Prisma as data origin')
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
