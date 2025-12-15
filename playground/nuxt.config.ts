export default defineNuxtConfig({
  modules: ['../src/module'],
  devtools: { enabled: true },
  compatibilityDate: '2025-03-30',

  graphql: {
    httpUrl: process.env.GRAPHQL_HTTP_URL || 'http://localhost:8080/v1/graphql',
    wsUrl: process.env.GRAPHQL_WS_URL || 'ws://localhost:8080/v1/graphql',
    debug: process.env.GRAPHQL_DEBUG === 'true',
    defaultHeaders: {
      // For development: Add your Hasura admin secret
      // WARNING: Never expose admin secret in production!
      'x-hasura-admin-secret': process.env.GRAPHQL_ADMIN_SECRET || 'myadminsecretkey',
    },
  },
})
