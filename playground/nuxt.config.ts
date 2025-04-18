export default defineNuxtConfig({
  modules: ['../src/module'],
  devtools: { enabled: true },
  compatibilityDate: '2025-03-30',

  dbConnect: {
    dataOrigin: (process.env.DATA_ORIGIN === 'hasura' || process.env.DATA_ORIGIN === 'prisma')
      ? process.env.DATA_ORIGIN
      : 'prisma',
    hasura: {
      url: process.env.HASURA_URL || '',
    },
    dataDebug: process.env.HASURA_DEBUG === 'true',
  },
})
