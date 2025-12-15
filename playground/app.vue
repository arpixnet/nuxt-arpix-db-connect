<template>
  <div class="playground-container">
    <header class="header">
      <h1>🚀 GraphQL Client Playground</h1>
      <p>Testing nuxt-arpix-db-connect v2.0.0</p>
    </header>

    <div class="examples">
      <!-- Query Example -->
      <section class="example-section">
        <h2>📝 Query Example</h2>
        <button @click="fetchUsers" :disabled="loadingQuery">
          {{ loadingQuery ? 'Loading...' : 'Fetch Users (with Auth)' }}
        </button>
        <button @click="fetchUsersPublic" :disabled="loadingPublicQuery">
          {{ loadingPublicQuery ? 'Loading...' : 'Fetch Users (Public)' }}
        </button>

        <div v-if="queryError" class="error">
          Error: {{ queryError }}
        </div>
        <div v-else-if="users" class="result">
          <pre>{{ JSON.stringify(users, null, 2) }}</pre>
        </div>
      </section>

      <!-- Mutation Example -->
      <section class="example-section">
        <h2>✏️ Mutation Example</h2>
        <input v-model="newUserName" placeholder="User name" />
        <input v-model="newUserEmail" placeholder="User email" />
        <button @click="createUser" :disabled="loadingMutation || !newUserName || !newUserEmail">
          {{ loadingMutation ? 'Creating...' : 'Create User' }}
        </button>

        <div v-if="mutationError" class="error">
          Error: {{ mutationError }}
        </div>
        <div v-else-if="createdUser" class="result">
          <pre>{{ JSON.stringify(createdUser, null, 2) }}</pre>
        </div>
      </section>

      <!-- Subscription Example -->
      <section class="example-section">
        <h2>🔄 Subscription Example</h2>
        <button @click="toggleSubscription">
          {{ isSubscribed ? 'Stop Subscription' : 'Start Subscription' }}
        </button>

        <div v-if="subscriptionError" class="error">
          Error: {{ subscriptionError }}
        </div>
        <div v-else-if="liveUsers" class="result">
          <p><strong>Live Data (auto-updates):</strong></p>
          <pre>{{ JSON.stringify(liveUsers, null, 2) }}</pre>
        </div>
      </section>

      <!-- Reactive Query Helper -->
      <section class="example-section">
        <h2>⚡ Reactive Query (useQuery)</h2>
        <button @click="reactiveRefetch" :disabled="reactiveLoading">
          {{ reactiveLoading ? 'Loading...' : 'Refetch' }}
        </button>

        <div v-if="reactiveError" class="error">
          Error: {{ reactiveError }}
        </div>
        <div v-else-if="reactiveData" class="result">
          <pre>{{ JSON.stringify(reactiveData, null, 2) }}</pre>
        </div>
      </section>

      <!-- Token Management -->
      <section class="example-section">
        <h2>🔐 Token Management</h2>
        <button @click="simulateLogin">Simulate Login</button>
        <button @click="simulateLogout">Simulate Logout</button>
        <button @click="testRefresh">Test Token Refresh</button>

        <div v-if="tokenMessage" class="info">
          {{ tokenMessage }}
        </div>
      </section>
    </div>

    <footer class="footer">
      <p>Module: nuxt-arpix-db-connect v2.0.0</p>
      <p>Generic GraphQL Client for Nuxt 3/4</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const { query, mutate, subscribe, useQuery, clearToken } = useGraphQLClient()

// Query Example
const users = ref(null)
const loadingQuery = ref(false)
const queryError = ref<string | null>(null)

const fetchUsers = async () => {
  loadingQuery.value = true
  queryError.value = null
  try {
    // Example query - adjust based on your GraphQL schema
    // Example query - using impersonation to test 'user' role permissions
    const result = await query(
      `
      query GetUsers {
        users(limit: 5) {
          name
        }
      }
      `,
      {}, // variables
      {
        // Headers to simulate a specific user role (requires admin secret to be set)
        headers: {
          // 'x-hasura-admin-secret': 'myadminsecretkey', // Explicitly add secret for testing
          'x-hasura-role': 'user',
          'x-hasura-user-id': '860b03b5-29bf-4223-a04f-1334281a8a66' // Simulate making the request as this user
        }
      }
    )
    users.value = result
  } catch (error: any) {
    queryError.value = error.message
  } finally {
    loadingQuery.value = false
  }
}

// Public Query Example
const loadingPublicQuery = ref(false)
const fetchUsersPublic = async () => {
  loadingPublicQuery.value = true
  queryError.value = null
  try {
    // Query without authentication (public role)
    const result = await query(
      `
      query GetUsersPublic {
        users(limit: 3) {
          id
          name
          email
        }
      }
      `,
      {},
      {
        skipAuth: true
      }
    )
    users.value = result
  } catch (error: any) {
    queryError.value = error.message
  } finally {
    loadingPublicQuery.value = false
  }
}

// Mutation Example
const newUserName = ref('')
const newUserEmail = ref('')
const createdUser = ref(null)
const loadingMutation = ref(false)
const mutationError = ref<string | null>(null)

const createUser = async () => {
  loadingMutation.value = true
  mutationError.value = null
  try {
    // Example mutation - adjust based on your GraphQL schema
    const result = await mutate(
      `
      mutation CreateUser($name: String!, $email: String!) {
        insert_users_one(object: {name: $name, email: $email}) {
          id
          name
          email
          created_at
        }
      }
      `,
      {
        name: newUserName.value,
        email: newUserEmail.value,
      }
    )
    createdUser.value = result
    newUserName.value = ''
    newUserEmail.value = ''
  } catch (error: any) {
    mutationError.value = error.message
  } finally {
    loadingMutation.value = false
  }
}

// Subscription Example
const liveUsers = ref(null)
const subscriptionError = ref<string | null>(null)
const isSubscribed = ref(false)
let unsubscribe: (() => void) | null = null

const toggleSubscription = () => {
  if (isSubscribed.value) {
    // Stop subscription
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    isSubscribed.value = false
    liveUsers.value = null
  } else {
    // Start subscription
    subscriptionError.value = null
    try {
      unsubscribe = subscribe(
        `
        subscription LiveUsers {
          users(limit: 5, order_by: {created_at: desc}) {
            id
            name
            email
            created_at
          }
        }
        `,
        {
          next: (data) => {
            liveUsers.value = data
          },
          error: (error) => {
            subscriptionError.value = error.message
            isSubscribed.value = false
          },
          complete: () => {
            isSubscribed.value = false
          },
        }
      )
      isSubscribed.value = true
    } catch (error: any) {
      subscriptionError.value = error.message
    }
  }
}

// Reactive Query Example
const { data: reactiveData, loading: reactiveLoading, error: reactiveError, refetch: reactiveRefetch } = useQuery(
  `
  query GetReactiveUsers {
    users(limit: 3) {
      id
      name
    }
  }
  `
)

// Token Management
const tokenMessage = ref<string | null>(null)

const simulateLogin = () => {
  // In a real app, this would come from your auth system
  const mockToken = generateMockToken()

  // Store in localStorage and cookie
  if (import.meta.client) {
    localStorage.setItem('auth_token', mockToken)
    document.cookie = `auth_token=${mockToken}; path=/; max-age=86400`
  }

  tokenMessage.value = 'Token set! Future requests will use authentication.'
  setTimeout(() => tokenMessage.value = null, 3000)
}

const simulateLogout = () => {
  clearToken()
  tokenMessage.value = 'Token cleared! Future requests will be public.'
  setTimeout(() => tokenMessage.value = null, 3000)
}

const testRefresh = async () => {
  try {
    const response = await fetch('/api/auth/refresh', { method: 'POST' })
    const data = await response.json()

    if (import.meta.client) {
      localStorage.setItem('auth_token', data.token)
      document.cookie = `auth_token=${data.token}; path=/; max-age=86400`
    }

    tokenMessage.value = 'Token refreshed successfully!'
    setTimeout(() => tokenMessage.value = null, 3000)
  } catch (error: any) {
    tokenMessage.value = `Refresh failed: ${error.message}`
  }
}

const generateMockToken = () => {
  const payload = {
    sub: 'user-123',
    exp: Math.floor(Date.now() / 1000) + 3600,
    'https://hasura.io/jwt/claims': {
      'x-hasura-allowed-roles': ['user', 'public'],
      'x-hasura-default-role': 'user',
      'x-hasura-user-id': 'user-123',
    },
  }
  return btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify(payload)) + '.signature'
}

// Cleanup
onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<style scoped>
.playground-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.header h1 {
  margin: 0;
  font-size: 2.5rem;
}

.header p {
  margin: 0.5rem 0 0;
  opacity: 0.9;
}

.examples {
  display: grid;
  gap: 2rem;
}

.example-section {
  padding: 1.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.example-section h2 {
  margin-top: 0;
  color: #2d3748;
  font-size: 1.5rem;
}

button {
  padding: 0.75rem 1.5rem;
  margin: 0.5rem 0.5rem 0.5rem 0;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

input {
  padding: 0.75rem;
  margin: 0.5rem 0.5rem 0.5rem 0;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 1rem;
  min-width: 200px;
}

input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.result {
  margin-top: 1rem;
  padding: 1rem;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow-x: auto;
}

.result pre {
  margin: 0;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  color: #2d3748;
}

.error {
  margin-top: 1rem;
  padding: 1rem;
  background: #fff5f5;
  border: 1px solid #fc8181;
  border-radius: 6px;
  color: #c53030;
}

.info {
  margin-top: 1rem;
  padding: 1rem;
  background: #ebf8ff;
  border: 1px solid #4299e1;
  border-radius: 6px;
  color: #2c5282;
}

.footer {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  color: #718096;
}

.footer p {
  margin: 0.25rem 0;
}
</style>
