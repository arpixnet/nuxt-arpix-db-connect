export default defineEventHandler(async (event) => {
  // This is a MOCK endpoint for testing purposes
  // In a real application, this would:
  // 1. Validate the refresh token from cookies
  // 2. Check if it's valid and not expired
  // 3. Generate a new access token
  // 4. Return the new token

  // Simulate a delay
  await new Promise(resolve => setTimeout(resolve, 500))

  // Mock JWT token (this is a fake token for testing)
  // In production, use a proper JWT library to generate real tokens
  const mockToken = generateMockJWT()

  return {
    token: mockToken,
    expiresAt: Date.now() + 3600000, // 1 hour from now
  }
})

/**
 * Generate a mock JWT token for testing
 * DO NOT USE IN PRODUCTION
 */
function generateMockJWT(): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }

  const payload = {
    sub: 'user-123',
    name: 'Test User',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    'https://hasura.io/jwt/claims': {
      'x-hasura-allowed-roles': ['user', 'public'],
      'x-hasura-default-role': 'user',
      'x-hasura-user-id': 'user-123',
    },
  }

  // Base64 encode (NOT SECURE - for testing only)
  const encodedHeader = btoa(JSON.stringify(header))
  const encodedPayload = btoa(JSON.stringify(payload))
  const signature = 'mock-signature'

  return `${encodedHeader}.${encodedPayload}.${signature}`
}
