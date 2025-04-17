<template>
  <div class="db-example">
    <h2>DB Connect Example</h2>
    
    <div v-if="loading">Loading...</div>
    <div v-else-if="error" class="error">
      Error: {{ error }}
    </div>
    <div v-else>
      <h3>Query Result:</h3>
      <pre>{{ JSON.stringify(result, null, 2) }}</pre>
    </div>
    
    <button @click="executeQuery">Execute Query</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useNuxtApp } from '#app'

const { $dbConnect } = useNuxtApp()

const loading = ref(false)
const error = ref(null)
const result = ref(null)

// Example query - replace with your actual query
const exampleQuery = `
  query GetUsers {
    users {
      id
      name
      email
    }
  }
`

async function executeQuery() {
  loading.value = true
  error.value = null
  
  try {
    result.value = await $dbConnect.query(exampleQuery)
  } catch (err) {
    error.value = err.message || 'An error occurred'
    console.error('Query error:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.db-example {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  max-width: 800px;
  margin: 0 auto;
}

.error {
  color: red;
  margin: 10px 0;
}

button {
  margin-top: 20px;
  padding: 8px 16px;
  background-color: #00DC82;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #00b86b;
}

pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow: auto;
}
</style>
