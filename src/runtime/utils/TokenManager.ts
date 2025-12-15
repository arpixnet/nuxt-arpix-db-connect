import { jwtDecode } from 'jwt-decode'
import type { DecodedToken, TokenRefreshResponse } from '../types/index.ts'

export class TokenManager {
  private refreshEndpoint?: string
  private isRefreshing = false
  private refreshPromise: Promise<string> | null = null

  constructor(refreshEndpoint?: string) {
    this.refreshEndpoint = refreshEndpoint
  }

  /**
   * Get a valid token, refreshing if necessary
   */
  async getValidToken(): Promise<string | null> {
    const currentToken = this.getToken()

    // If no token and no refresh endpoint configured, return null (public mode)
    if (!currentToken && !this.refreshEndpoint) {
      return null
    }

    // If no token but refresh endpoint exists, try to refresh
    if (!currentToken && this.refreshEndpoint) {
      return this.refreshToken()
    }

    // Check if token is valid
    if (currentToken && this.isTokenValid(currentToken)) {
      return currentToken
    }

    // Token is expired, refresh it
    if (this.refreshEndpoint) {
      return this.refreshToken()
    }

    // No refresh endpoint, return null
    return null
  }

  /**
   * Get token from storage (cookie or localStorage)
   */
  private getToken(): string | null {
    // Try to get from cookie first
    if (import.meta.client) {
      const cookieToken = this.getCookie('auth_token')
      if (cookieToken) return cookieToken

      // Fallback to localStorage
      const localStorageToken = localStorage.getItem('auth_token')
      if (localStorageToken) return localStorageToken
    }

    return null
  }

  /**
   * Set token in storage
   */
  private setToken(token: string): void {
    if (import.meta.client) {
      // Store in cookie
      this.setCookie('auth_token', token, 7) // 7 days

      // Also store in localStorage as backup
      localStorage.setItem('auth_token', token)
    }
  }

  /**
   * Check if token is valid (not expired)
   */
  private isTokenValid(token: string): boolean {
    try {
      const decoded = jwtDecode<DecodedToken>(token)
      
      if (!decoded.exp) {
        // No expiration, assume valid
        return true
      }

      // Check if token expires in the next 60 seconds
      const now = Math.floor(Date.now() / 1000)
      const bufferTime = 60 // 60 seconds buffer
      
      return decoded.exp > now + bufferTime
    } catch (error) {
      console.error('Error decoding token:', error)
      return false
    }
  }

  /**
   * Refresh the token
   */
  private async refreshToken(): Promise<string> {
    // If already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    if (!this.refreshEndpoint) {
      throw new Error('No refresh endpoint configured')
    }

    this.isRefreshing = true
    this.refreshPromise = this.performRefresh()

    try {
      const newToken = await this.refreshPromise
      return newToken
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performRefresh(): Promise<string> {
    try {
      const response = await fetch(this.refreshEndpoint!, {
        method: 'POST',
        credentials: 'include', // Include cookies for refresh token
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const data: TokenRefreshResponse = await response.json()
      
      if (!data.token) {
        throw new Error('No token in refresh response')
      }

      this.setToken(data.token)
      return data.token
    } catch (error) {
      console.error('Token refresh error:', error)
      throw error
    }
  }

  /**
   * Get cookie value
   */
  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null

    const nameEQ = name + '='
    const ca = document.cookie.split(';')
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) === ' ') c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
    }
    
    return null
  }

  /**
   * Set cookie value
   */
  private setCookie(name: string, value: string, days: number): void {
    if (typeof document === 'undefined') return

    let expires = ''
    if (days) {
      const date = new Date()
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
      expires = '; expires=' + date.toUTCString()
    }
    
    document.cookie = name + '=' + (value || '') + expires + '; path=/'
  }

  /**
   * Clear token from storage
   */
  clearToken(): void {
    if (import.meta.client) {
      // Clear cookie
      this.setCookie('auth_token', '', -1)
      
      // Clear localStorage
      localStorage.removeItem('auth_token')
    }
  }
}
