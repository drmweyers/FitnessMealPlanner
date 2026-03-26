/**
 * Authentication helpers for batch executor.
 * Handles multiple API response formats.
 */

export function extractToken(response: any): string {
  if (!response || typeof response !== 'object') {
    throw new Error(`No token: response is ${typeof response}`);
  }

  // Prefer new format: { data: { accessToken } }
  const token = response.data?.accessToken || response.token;

  if (!token || typeof token !== 'string') {
    throw new Error(`No token found in response: ${JSON.stringify(response).substring(0, 200)}`);
  }

  return token;
}
