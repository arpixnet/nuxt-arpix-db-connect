# DB Connect Module for Nuxt 3

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt](https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js)](https://nuxt.com)

A flexible database connection module for Nuxt 3 applications, providing a clean interface for Hasura GraphQL API.

<!-- - [✨ &nbsp;Release Notes](/CHANGELOG.md) -->
<!-- - [🏀 Online playground](https://stackblitz.com/github/arpixnet/nuxt-arpix-db-connect?file=playground%2Fapp.vue) -->
<!-- - [📖 &nbsp;Documentation](https://example.com) -->

## Features

- 🔌 &nbsp;Configurable Hasura GraphQL connection
- 🚀 &nbsp;Easy GraphQL queries, mutations, and subscriptions
- 📊 &nbsp;High-level database operations (get, insert, update, delete, batch)
- 🔄 &nbsp;Real-time data with WebSocket support
- 🐞 &nbsp;Debug mode for development
- 🔧 &nbsp;Extensible architecture for adding more data sources

## Quick Setup

Install the module to your Nuxt application:

```bash
npm install nuxt-arpix-db-connect
# or
yarn add nuxt-arpix-db-connect
```

Add the module to your `nuxt.config.ts` file:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-arpix-db-connect'],
  dbConnect: {
    dataOrigin: 'hasura',
    hasura: {
      url: 'https://your-hasura-endpoint.com/v1/graphql',
      wsUrl: 'wss://your-hasura-endpoint.com/v1/graphql', // Optional, for subscriptions
      headers: {
        'x-hasura-admin-secret': 'your-admin-secret',
        // Add any other headers you need
      }
    },
    dataDebug: false, // Set to true for debugging
  }
})
```

## Usage

### Basic GraphQL Operations

#### Query

```vue
<script setup>
import { useNuxtApp } from '#app'

const { $dbConnect } = useNuxtApp()

// Execute a GraphQL query
const { data } = await $dbConnect.query(`
  query GetUsers {
    users {
      id
      name
      email
    }
  }
`)
</script>
```

#### Mutation

```vue
<script setup>
import { useNuxtApp } from '#app'

const { $dbConnect } = useNuxtApp()

// Execute a GraphQL mutation
const { data } = await $dbConnect.mutate(
  `
  mutation CreateUser($name: String!, $email: String!) {
    insert_users_one(object: {name: $name, email: $email}) {
      id
      name
      email
    }
  }
`,
  {
    variables: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  }
)
</script>
```

#### Subscription (Hasura only)

```vue
<script setup>
import { ref, onUnmounted } from 'vue'
import { useNuxtApp } from '#app'

const { $dbConnect } = useNuxtApp()
const users = ref([])

// Create a subscription
const subscription = $dbConnect.subscribe(
  `
  subscription WatchUsers {
    users {
      id
      name
      email
      updated_at
    }
  }
`,
  {
    onData: (data) => {
      users.value = data.users
    },
    onError: (error) => {
      console.error('Subscription error:', error)
    }
  }
)

// Clean up subscription when component is unmounted
onUnmounted(() => {
  subscription.unsubscribe()
})
</script>
```

### High-Level Database Operations

#### Get Data

```vue
<script setup>
import { useNuxtApp } from '#app'

const { $dbConnect } = useNuxtApp()

// Get users with filtering, ordering, and pagination
const { users } = await $dbConnect.get('users', {
  select: ['id', 'name', 'email', 'created_at'],
  where: {
    role: { _eq: 'admin' },
    _or: [
      { status: { _eq: 'active' } },
      { status: { _eq: 'pending' } }
    ]
  },
  orderBy: { created_at: 'desc' },
  limit: 10,
  offset: 0
})
</script>
```

#### Insert Data

```vue
<script setup>
import { useNuxtApp } from '#app'

const { $dbConnect } = useNuxtApp()

// Insert a single record
const { insert_users_one } = await $dbConnect.insert(
  'users',
  { name: 'John Doe', email: 'john@example.com', role: 'user' },
  null,
  ['id', 'created_at']
)

// Insert multiple records with on-conflict handling
const { affected_rows } = await $dbConnect.insert(
  'users',
  [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ],
  {
    constraint: 'users_pkey',
    update_columns: ['name', 'email']
  }
)
</script>
```

#### Update Data

```vue
<script setup>
import { useNuxtApp } from '#app'

const { $dbConnect } = useNuxtApp()

// Update records
const { affected_rows } = await $dbConnect.update(
  'users',
  { status: 'inactive', updated_at: new Date().toISOString() },
  { last_login: { _lt: '2023-01-01' } }
)

// Update multiple records with different values
const result = await $dbConnect.updateMany(
  'products',
  [
    { data: { price: 19.99 }, where: { id: { _eq: 1 } } },
    { data: { price: 29.99 }, where: { id: { _eq: 2 } } }
  ]
)
</script>
```

#### Delete Data

```vue
<script setup>
import { useNuxtApp } from '#app'

const { $dbConnect } = useNuxtApp()

// Delete records
const { affected_rows } = await $dbConnect.delete(
  'users',
  { status: { _eq: 'inactive' } }
)
</script>
```

#### Batch Operations

```vue
<script setup>
import { useNuxtApp } from '#app'

const { $dbConnect } = useNuxtApp()

// Execute multiple operations in a single request
const result = await $dbConnect.batch([
  {
    type: 'insert',
    table: 'categories',
    data: { name: 'New Category' },
    returning: 'id',
    alias: 'insert_category'
  },
  {
    type: 'update',
    table: 'products',
    data: { category_id: null },
    where: { category_id: { _eq: 5 } },
    alias: 'update_products'
  },
  {
    type: 'delete',
    table: 'categories',
    where: { id: { _eq: 5 } },
    alias: 'delete_category'
  }
])

// Access results by alias
const newCategoryId = result.insert_category.id
const updatedProducts = result.update_products.affected_rows
const deletedCategories = result.delete_category.affected_rows
</script>
```

### Future Integrations

This module is designed to be extensible. While it currently only supports Hasura, it has been architected to allow for additional database connectors in the future.

If you're interested in contributing or have suggestions for other database integrations, please open an issue or pull request on the GitHub repository.

#### Setting Headers

```vue
<script setup>
import { useNuxtApp } from '#app'

const { $dbConnect } = useNuxtApp()

// Set headers for all subsequent requests
$dbConnect.setHeaders({
  'Authorization': `Bearer ${token}`,
  'x-hasura-role': 'admin'
})

// Or set a single header
$dbConnect.setHeader('x-hasura-user-id', userId)

// Headers can also be set for individual requests
const { data } = await $dbConnect.query(
  `query { ... }`,
  { headers: { 'x-hasura-role': 'user' } }
)
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dataOrigin` | `'hasura'` | `'hasura'` | The data source to use (currently only 'hasura' is supported) |
| `hasura.url` | `string` | - | Hasura GraphQL endpoint URL |
| `hasura.wsUrl` | `string` | - | Hasura WebSocket URL for subscriptions |
| `hasura.headers` | `Record<string, string>` | `{}` | Headers to include in Hasura requests |
| `dataDebug` | `boolean` | `false` | Enable debug logging |

## API Reference

### Basic GraphQL Operations

| Method | Parameters | Description |
|--------|------------|-------------|
| `query` | `query: string, options?: { variables?: Record<string, any>, headers?: Record<string, string> }` | Execute a raw GraphQL query |
| `mutate` | `mutation: string, options?: { variables?: Record<string, any>, headers?: Record<string, string> }` | Execute a raw GraphQL mutation |
| `subscribe` | `subscription: string, options?: { variables?: Record<string, any>, headers?: Record<string, string>, onData?: (data: any) => void, onError?: (error: any) => void }` | Subscribe to real-time data |

### High-Level Database Operations

| Method | Parameters | Description |
|--------|------------|-------------|
| `get` | `tableName: string, options: { select: string \| string[] \| Record<string, any>, where?: WhereClause, limit?: number, offset?: number, orderBy?: OrderByClause \| OrderByClause[], aggregate?: string }, token?: string` | Get data from a table with filtering, ordering, and pagination |
| `insert` | `tableName: string, data: any \| any[], onConflict?: OnConflictClause \| null, returning?: string \| string[], token?: string` | Insert data into a table |
| `update` | `tableName: string, data: any, where: WhereClause, returning?: string \| string[], token?: string` | Update data in a table |
| `delete` | `tableName: string, where: WhereClause, returning?: string \| string[], token?: string` | Delete data from a table |
| `updateMany` | `tableName: string, data: Array<{ data: any, where: WhereClause }>, returning?: string \| string[], token?: string` | Update multiple records with different values |
| `batch` | `operations: BatchOperation[], token?: string` | Execute multiple operations in a single request |

### Header Management

| Method | Parameters | Description |
|--------|------------|-------------|
| `setHeaders` | `headers: Record<string, string>` | Set headers for all subsequent requests |
| `setHeader` | `key: string, value: string` | Add a single header for all subsequent requests |

### Client Access

| Method | Parameters | Description |
|--------|------------|-------------|
| `getClient` | `token?: string` | Get the native GraphQLClient instance |


## Contribution

<details>
  <summary>Local development</summary>

  ```bash
  # Install dependencies
  npm install

  # Generate type stubs
  npm run dev:prepare

  # Develop with the playground
  npm run dev

  # Build the playground
  npm run dev:build

  # Run ESLint
  npm run lint

  # Run Vitest
  npm run test
  npm run test:watch

  # Release new version
  npm run release
  ```

</details>


<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-arpix-db-connect/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-arpix-db-connect

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-arpix-db-connect.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-arpix-db-connect

[license-src]: https://img.shields.io/npm/l/nuxt-arpix-db-connect.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-arpix-db-connect

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
