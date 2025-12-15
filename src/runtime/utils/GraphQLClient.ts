import { GraphQLClient as GQLClient } from 'graphql-request'
import { createClient, Client } from 'graphql-ws'
import type { GraphQLConfig, RequestOptions, SubscriptionHandlers } from '../types'
import { TokenManager } from './TokenManager'

export class GraphQLClient {
  private httpClient: GQLClient
  private wsClient: Client | null = null
  private tokenManager: TokenManager
  private config: GraphQLConfig

  constructor(config: GraphQLConfig) {
    this.config = config
    this.httpClient = new GQLClient(config.httpUrl)
    this.tokenManager = new TokenManager(config.refreshTokenEndpoint)

    // Initialize WebSocket client if wsUrl is provided
    if (config.wsUrl && import.meta.client) {
      this.initializeWSClient()
    }
  }

  /**
   * Log message if debug mode is enabled
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`[GraphQL Client] ${message}`, ...args)
    }
  }

  /**
   * Initialize WebSocket client
   */
  private initializeWSClient(): void {
    if (!this.config.wsUrl) return

    this.log('Initializing WebSocket client for:', this.config.wsUrl)

    this.wsClient = createClient({
      url: this.config.wsUrl,
      connectionParams: async () => {
        const token = await this.tokenManager.getValidToken()
        const headers: Record<string, string> = {}
        
        // Add authorization token if available
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        
        // Add default headers (including admin secret for dev)
        if (this.config.defaultHeaders) {
          Object.assign(headers, this.config.defaultHeaders)
        }
        
        this.log('WebSocket connection params:', { headers })
        return { headers }
      },
      on: {
        connected: () => {
          this.log('✅ WebSocket connected successfully')
        },
        error: (error) => {
          console.error('❌ WebSocket error:', error)
        },
        closed: () => {
          this.log('🔌 WebSocket connection closed')
        },
      },
      shouldRetry: () => true,
      retryAttempts: 5,
      retryWait: async (retries) => {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retries), 16000)))
      },
    })
  }

  /**
   * Execute a GraphQL query
   */
  async query<T = any>(
    query: string,
    variables?: any,
    options?: RequestOptions
  ): Promise<T> {
    try {
      // Prepare request headers starting with defaults
      const requestHeaders: Record<string, string> = {}
      
      // Copy defaults ensuring lowercase keys to prevent duplicates
      if (this.config.defaultHeaders) {
        Object.entries(this.config.defaultHeaders).forEach(([key, value]) => {
          requestHeaders[key.toLowerCase()] = value
        })
      }

      // Get valid token
      const token = options?.skipAuth ? null : await this.tokenManager.getValidToken()

      // Set authorization header if token exists
      if (token) {
        requestHeaders['authorization'] = `Bearer ${token}`
      }

      // Merge custom headers if provided (overriding defaults, enforcing lowercase)
      if (options?.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          requestHeaders[key.toLowerCase()] = value
        })
      }

      this.log('Executing query:', { query, variables, headers: JSON.stringify(requestHeaders, null, 2) })
      
      // Pass headers specifically for this request
      const result = await this.httpClient.request<T>(query, variables, requestHeaders)
      this.log('Query result:', result)
      
      return result
    } catch (error) {
      console.error('GraphQL query error:', error)
      throw error
    }
  }

  /**
   * Execute a GraphQL mutation
   */
  async mutate<T = any>(
    mutation: string,
    variables?: any,
    options?: RequestOptions
  ): Promise<T> {
    // Mutations use the same logic as queries
    return this.query<T>(mutation, variables, options)
  }

  /**
   * Subscribe to GraphQL subscription
   */
  subscribe(
    subscription: string,
    handlers: SubscriptionHandlers,
    variables?: any
  ): () => void {
    if (!this.wsClient) {
      console.error('WebSocket client not initialized. Make sure wsUrl is configured.')
      return () => {}
    }

    this.log('📡 Starting subscription:', { subscription, variables })

    const unsubscribe = this.wsClient.subscribe(
      {
        query: subscription,
        variables,
      },
      {
        next: (data) => {
          this.log('📨 Subscription data received:', data)
          if (data.data) {
            handlers.next(data.data)
          }
        },
        error: (error) => {
          console.error('❌ Subscription error:', error)
          if (handlers.error) {
            handlers.error(error)
          }
        },
        complete: () => {
          this.log('✅ Subscription completed')
          if (handlers.complete) {
            handlers.complete()
          }
        },
      }
    )

    return unsubscribe as () => void
  }

  /**
   * Close WebSocket connection
   */
  dispose(): void {
    if (this.wsClient) {
      this.wsClient.dispose()
    }
  }

  /**
   * Get the underlying HTTP client for advanced usage
   */
  getHTTPClient(): GQLClient {
    return this.httpClient
  }

  /**
   * Get the underlying WebSocket client for advanced usage
   */
  getWSClient(): Client | null {
    return this.wsClient
  }

  /**
   * Get the token manager for manual token operations
   */
  getTokenManager(): TokenManager {
    return this.tokenManager
  }
}
