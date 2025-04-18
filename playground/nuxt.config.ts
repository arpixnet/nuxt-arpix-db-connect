export default defineNuxtConfig({
  modules: ['../src/module'],
  devtools: { enabled: true },
  compatibilityDate: '2025-03-30',

  dbConnect: {
    hasura: {
      url: process.env.HASURA_URL || 'http://localhost:8080/v1/graphql',
      headers: {
        'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET || 'your-admin-secret',
      },
    },
    dataDebug: process.env.HASURA_DEBUG === 'true',
  },
})
