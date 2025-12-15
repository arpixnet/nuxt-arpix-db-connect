import { ref } from 'vue'
import { useRuntimeConfig } from 'nuxt/app'
import { GraphQLClient } from '../utils/GraphQLClient'
import type { GraphQLConfig, RequestOptions, SubscriptionHandlers } from '../types'

let clientInstance: GraphQLClient | null = null

/**
 * Main composable for GraphQL operations
 * Provides query, mutate, and subscribe methods
 */
export function useGraphQLClient() {
  const config = useRuntimeConfig()

  // Initialize client if not already created
  if (!clientInstance) {
    const graphqlConfig: GraphQLConfig = config.public.graphql as GraphQLConfig

    if (!graphqlConfig?.httpUrl) {
      throw new Error(
        'GraphQL httpUrl not configured. Please add runtimeConfig.public.graphql.httpUrl to your nuxt.config.ts'
      )
    }

    clientInstance = new GraphQLClient(graphqlConfig)
  }

  /**
   * Execute a GraphQL query
   * @param query GraphQL query string
   * @param variables Query variables
   * @param options Request options (headers, skipAuth)
   * @returns Query result
   */
  const query = async <T = any>(
    query: string,
    variables?: any,
    options?: RequestOptions
  ): Promise<T> => {
    return clientInstance!.query<T>(query, variables, options)
  }

  /**
   * Execute a GraphQL mutation
   * @param mutation GraphQL mutation string
   * @param variables Mutation variables
   * @param options Request options (headers, skipAuth)
   * @returns Mutation result
   */
  const mutate = async <T = any>(
    mutation: string,
    variables?: any,
    options?: RequestOptions
  ): Promise<T> => {
    return clientInstance!.mutate<T>(mutation, variables, options)
  }

  /**
   * Subscribe to GraphQL subscription
   * @param subscription GraphQL subscription string
   * @param handlers Subscription handlers (next, error, complete)
   * @param variables Subscription variables
   * @returns Unsubscribe function
   */
  const subscribe = (
    subscription: string,
    handlers: SubscriptionHandlers,
    variables?: any
  ): (() => void) => {
    return clientInstance!.subscribe(subscription, handlers, variables)
  }

  /**
   * Create a reactive query that auto-updates
   * @param query GraphQL query string
   * @param variables Query variables (can be reactive)
   * @param options Request options
   */
  const useQuery = <T = any>(
    query: string,
    variables?: any,
    options?: RequestOptions
  ) => {
    const data = ref<T | null>(null)
    const loading = ref(false)
    const error = ref<Error | null>(null)

    const execute = async () => {
      loading.value = true
      error.value = null
      try {
        data.value = await clientInstance!.query<T>(query, variables, options)
      } catch (e) {
        error.value = e as Error
      } finally {
        loading.value = false
      }
    }

    // Execute immediately
    execute()

    return {
      data,
      loading,
      error,
      refetch: execute,
    }
  }

  /**
   * Create a reactive subscription
   * @param subscription GraphQL subscription string
   * @param variables Subscription variables
   */
  const useSubscription = <T = any>(subscription: string, variables?: any) => {
    const data = ref<T | null>(null)
    const error = ref<Error | null>(null)
    const isActive = ref(false)

    let unsubscribeFn: (() => void) | null = null

    const start = () => {
      if (isActive.value) return

      isActive.value = true
      unsubscribeFn = clientInstance!.subscribe(
        subscription,
        {
          next: (newData) => {
            data.value = newData as T
          },
          error: (err) => {
            error.value = err as Error
            isActive.value = false
          },
          complete: () => {
            isActive.value = false
          },
        },
        variables
      )
    }

    const stop = () => {
      if (unsubscribeFn) {
        unsubscribeFn()
        unsubscribeFn = null
      }
      isActive.value = false
    }

    // Auto-start subscription
    start()

    return {
      data,
      error,
      isActive,
      start,
      stop,
    }
  }

  /**
   * Get the underlying GraphQL client instance
   */
  const getClient = () => clientInstance

  /**
   * Clear token (logout)
   */
  const clearToken = () => {
    clientInstance?.getTokenManager().clearToken()
  }

  return {
    query,
    mutate,
    subscribe,
    useQuery,
    useSubscription,
    getClient,
    clearToken,
  }
}
