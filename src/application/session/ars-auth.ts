import { getConfigValue } from '@/utils/runtime-config';
import { saveRedirectTo } from './sign_in';
import { saveGoTrueAuth } from './token';

// The public ARS issuer owns login. AppFlowy never receives its session cookie.
export const ARS_ORIGIN = getConfigValue('ARS_AUTH_ORIGIN', 'https://africanresearchsociety.org');
const issuer = new URL(ARS_ORIGIN);

if (issuer.origin !== ARS_ORIGIN || issuer.protocol !== 'https:')
  throw new Error('ARS_AUTH_ORIGIN must be an HTTPS origin');
const CLIENT_ID = 'ars-appflowy-web';
const FLOW_KEY = 'ars-oidc-flow';

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function startArsLogin(redirectTo?: string) {
  if (redirectTo) saveRedirectTo(redirectTo);
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const nonce = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  const current = new URL(window.location.href);

  sessionStorage.setItem(
    FLOW_KEY,
    JSON.stringify({
      verifier,
      state,
      nonce,
      createdAt: Date.now(),
      team: current.searchParams.get('ars_team'),
      path: current.searchParams.get('ars_path'),
    })
  );
  const url = new URL('/api/auth/oauth2/authorize', ARS_ORIGIN);

  url.search = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/callback`,
    response_type: 'code',
    scope: 'openid profile email offline_access',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  }).toString();
  window.location.assign(url.toString());
}

export async function exchangeArsToken(
  body: { refresh_token: string } | { code: string; code_verifier: string; nonce: string }
) {
  const response = await fetch(`${ARS_ORIGIN}/api/integrations/appflowy/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'omit',
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error('Your ARS session expired. Please sign in again.');
  const result = await response.json();

  return result;
}

export async function completeArsLogin(url: URL) {
  const stored = sessionStorage.getItem(FLOW_KEY);

  if (!stored) throw new Error('Sign-in has expired. Please start again.');
  const flow = JSON.parse(stored);
  const code = url.searchParams.get('code');

  if (
    !code ||
    flow.state !== url.searchParams.get('state') ||
    typeof flow.createdAt !== 'number' ||
    Date.now() < flow.createdAt ||
    Date.now() - flow.createdAt > 10 * 60 * 1000
  )
    throw new Error('Invalid sign-in state');
  sessionStorage.removeItem(FLOW_KEY);
  const result = await exchangeArsToken({ code, code_verifier: flow.verifier, nonce: flow.nonce });

  if (!saveGoTrueAuth(JSON.stringify(result))) throw new Error('Invalid ARS session response');
  // Remove authorization material before the app's existing post-login routing.
  const clean = new URL('/auth/callback', window.location.origin);

  if (typeof flow.team === 'string' && /^[a-f0-9-]{36}$/.test(flow.team)) clean.searchParams.set('ars_team', flow.team);
  if (typeof flow.path === 'string' && /^\/[A-Za-z0-9/_-]*$/.test(flow.path))
    clean.searchParams.set('ars_path', flow.path);
  window.history.replaceState(null, '', clean);
  return result;
}
