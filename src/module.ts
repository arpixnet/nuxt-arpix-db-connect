import { defineNuxtModule, addImportsDir, createResolver } from '@nuxt/kit'

const MODULE_NAME = 'nuxt-arpix-graphql-connect'
const CONFIG_KEY = 'graphql'

// Module options TypeScript interface definition
export interface ModuleOptions {
  httpUrl: string
  wsUrl?: string
  refreshTokenEndpoint?: string
  defaultHeaders?: Record<string, string>
  debug?: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: MODULE_NAME,
    configKey: CONFIG_KEY,
    compatibility: {
      nuxt: '^3.0.0 || ^4.0.0',
    },
  },
  defaults: {
    httpUrl: 'http://localhost:8080/v1/graphql',
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Validate essential configuration
    if (!options?.httpUrl) {
      throw new Error('GraphQL httpUrl is required. Please configure graphql.httpUrl in your nuxt.config.ts')
    }

    // Make options available in runtime via runtimeConfig
    nuxt.options.runtimeConfig.public.graphql = options

    // Add composables directory for auto-import
    const composablesDir = resolver.resolve('./runtime/composables')
    addImportsDir(composablesDir)

    console.log(`[${MODULE_NAME}] Module initialized - Generic GraphQL client ready`)
  },
})
