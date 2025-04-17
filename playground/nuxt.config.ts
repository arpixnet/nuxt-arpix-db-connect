import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@arpix/nuxt-arpix-db-connect'],
  devtools: { enabled: true },
  compatibilityDate: '2025-04-17',

  dbConnect: {
    dataOrigin: 'hasura',
    hasura: {
      url: 'https://your-hasura-endpoint.com/v1/graphql',
    },
    dataDebug: true,
  },
})
