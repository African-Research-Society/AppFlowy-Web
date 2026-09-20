export const EMBED_REFRESH_COOKIE = 'af_embed_rt';

export function serializeEmbedRefreshCookie(token: string, protocol: string) {
  const value = encodeURIComponent(token);
  if (!value || value.length > 3500) return null;
  const secure = protocol === 'https:';
  return `${EMBED_REFRESH_COOKIE}=${value}; Path=/; Max-Age=2592000${
    secure ? '; Secure; SameSite=None' : '; SameSite=Lax'
  }`;
}

export function parseEmbedRefreshCookie(cookie: string) {
  const match = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${EMBED_REFRESH_COOKIE}=`));
  if (!match) return null;
  try {
    const value = decodeURIComponent(match.slice(EMBED_REFRESH_COOKIE.length + 1));
    return value || null;
  } catch {
    return null;
  }
}

export function writeEmbedRefreshCookie(token: string) {
  try {
    const protocol = typeof window === 'undefined' ? 'https:' : window.location.protocol;
    const serialized = serializeEmbedRefreshCookie(token, protocol);
    if (serialized) document.cookie = serialized;
  } catch {
    /* Storage can be unavailable in privacy-restricted browser contexts. */
  }
}

export function clearEmbedRefreshCookie(protocol?: string) {
  try {
    const secure =
      (protocol ?? (typeof window === 'undefined' ? 'https:' : window.location.protocol)) ===
      'https:';
    document.cookie = `${EMBED_REFRESH_COOKIE}=; Path=/; Max-Age=0${
      secure ? '; Secure; SameSite=None' : '; SameSite=Lax'
    }`;
  } catch {
    /* ignore */
  }
}

export function embedReturnPath(
  pathname: string,
  referrer: string,
  origin: string,
  search = ''
) {
  if (pathname.startsWith('/app/')) return `${pathname}${search}`;
  try {
    const from = new URL(referrer);
    if (from.origin === origin && from.pathname.startsWith('/app/')) {
      return `${from.pathname}${from.search}`;
    }
  } catch {
    /* malformed referrer is not a return path */
  }
  return '/app';
}

export async function restoreEmbedSession(input: {
  hasToken: boolean;
  cookie: string | (() => string);
  refresh: (token: string) => Promise<unknown>;
  hasStorageAccess?: () => Promise<boolean>;
  requestStorageAccess?: () => Promise<void>;
}): Promise<'ready' | 'restored' | 'missing'> {
  if (input.hasToken) return 'ready';
  try {
    if (input.hasStorageAccess && !(await input.hasStorageAccess())) {
      await input.requestStorageAccess?.();
    }
  } catch {
    /* Storage Access API is best-effort after the first-party Connect visit. */
  }
  const cookie = typeof input.cookie === 'function' ? input.cookie() : input.cookie;
  const refreshToken = parseEmbedRefreshCookie(cookie);
  if (!refreshToken) return 'missing';
  await input.refresh(refreshToken);
  return 'restored';
}
