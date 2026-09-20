export const EMBED_REFRESH_COOKIE = 'af_embed_rt';
export const EMBED_PARENT_KEY = 'ars_embed_parent';
export const EMBED_PATH_KEY = 'ars_embed_path';

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

export function withEmbedQuery(path: string, search = '') {
  const [pathname, existing] = path.split('?');
  const params = new URLSearchParams(existing || search.replace(/^\?/, ''));
  params.set('ars_embed', '1');
  return `${pathname}?${params}`;
}

export function rememberEmbedContext(input: {
  parent?: string | null;
  path?: string;
  search?: string;
  storage?: Pick<Storage, 'setItem'>;
}) {
  const storage = input.storage;
  if (!storage) return;
  if (input.parent) storage.setItem(EMBED_PARENT_KEY, input.parent);
  if (input.path?.startsWith('/app')) {
    storage.setItem(EMBED_PATH_KEY, withEmbedQuery(input.path, input.search));
  }
}

export function recalledEmbedParent(
  stored: string | null | undefined,
  allowlisted: (origin: string) => boolean
) {
  return stored && allowlisted(stored) ? stored : null;
}

export function allowEmbedWorkspaceRedirect(input: {
  pathname: string;
  search?: string;
  inIframe?: boolean;
}) {
  if (!/\/app\/[a-f0-9-]{36}/i.test(input.pathname)) return true;
  return Boolean(input.inIframe || /(?:^|[?&])ars_embed=1(?:&|$)/.test(input.search ?? ''));
}

export function embedReturnPath(input: {
  pathname: string;
  referrer: string;
  origin: string;
  search?: string;
  inIframe?: boolean;
  savedPath?: string | null;
}) {
  const embed = Boolean(
    input.inIframe || /(?:^|[?&])ars_embed=1(?:&|$)/.test(input.search ?? '')
  );
  const keep = (pathname: string, search = '') =>
    embed ? withEmbedQuery(pathname, search) : `${pathname}${search}`;

  if (input.pathname.startsWith('/app/')) return keep(input.pathname, input.search ?? '');

  if (input.savedPath) {
    try {
      const from = new URL(input.savedPath, input.origin);
      if (from.origin === input.origin && from.pathname.startsWith('/app')) {
        return keep(from.pathname, from.search);
      }
    } catch {
      /* ignore stored bounce */
    }
  }

  try {
    const from = new URL(input.referrer);
    if (from.origin === input.origin && from.pathname.startsWith('/app/')) {
      return keep(from.pathname, from.search);
    }
  } catch {
    /* malformed referrer is not a return path */
  }

  return embed ? '/app?ars_embed=1' : '/app';
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
