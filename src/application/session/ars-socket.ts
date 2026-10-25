import { getTokenParsed, invalidToken } from './token';
import { refreshToken } from '@/application/services/js-services/http/gotrue';

// ARS bridge tokens live for five minutes. Resolve a fresh token for every
// connection attempt so retries never keep sending the expired URL token.
export async function arsSocketAccessToken(): Promise<string> {
  const current = getTokenParsed();
  if (!current) throw new Error('ARS session unavailable');
  if (current.expires_at > Date.now() / 1000 + 30) return current.access_token;
  try {
    return (await refreshToken(current.refresh_token)).access_token;
  } catch (error) {
    invalidToken();
    throw error;
  }
}
