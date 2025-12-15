export interface GraphQLConfig {
  httpUrl: string
  wsUrl?: string
  refreshTokenEndpoint?: string
  defaultHeaders?: Record<string, string>
  debug?: boolean
}

export interface RequestOptions {
  headers?: Record<string, string>
  skipAuth?: boolean
}

export interface SubscriptionHandlers {
  next: (data: any) => void
  error?: (error: any) => void
  complete?: () => void
}

export interface TokenRefreshResponse {
  token: string
  expiresAt?: number
}

export interface DecodedToken {
  exp?: number
  iat?: number
  [key: string]: any
}
