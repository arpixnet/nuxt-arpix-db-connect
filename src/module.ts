import { defineNuxtModule, addPlugin, createResolver } from '@nuxt/kit'

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
  },
  // Default configuration options of the Nuxt module
  defaults: {
    dataOrigin: 'hasura',
    dataDebug: false,
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Make options available in runtime
    nuxt.options.runtimeConfig.public[CONFIG_KEY] = options

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin'))
  },
})
