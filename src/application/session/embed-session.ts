export const EMBED_REFRESH_COOKIE = 'af_embed_rt';
export const EMBED_PARENT_KEY = 'ars_embed_parent';
export const EMBED_PATH_KEY = 'ars_embed_path';

export function serializeEmbedRefreshCookie(token: string, protocol: string) {
  const value = encodeURIComponent(token);
  if (!value || value.length > 3500) return null;
  const secure = protocol === 'https:';
  // Leave this cookie unpartitioned. Storage Access reveals the first-party
  // cookie in the hub iframe; a Partitioned (CHIPS) cookie is keyed to the
  // top-level site that set it and stays in the other jar.
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
    const secure = (protocol ?? (typeof window === 'undefined' ? 'https:' : window.location.protocol)) === 'https:';
    const expired = `${EMBED_REFRESH_COOKIE}=; Path=/; Max-Age=0`;
    if (!secure) {
      document.cookie = `${expired}; SameSite=Lax`;
      return;
    }
    document.cookie = `${expired}; Secure; SameSite=None`;
    // Also drop a CHIPS cookie left by an older session in this top-level site.
    document.cookie = `${expired}; Secure; SameSite=None; Partitioned`;
  } catch {
    /* ignore */
  }
}

/**
 * Embed URLs carry the editor pathname and `ars_embed=1` only.
 * Query strings and fragments can hold tokens, briefs, prompts, transcripts, or audio.
 */
export function withEmbedQuery(path: string, _search = '') {
  const pathname = path.split(/[?#]/)[0] ?? '';
  if (
    !pathname.startsWith('/') ||
    pathname.startsWith('//') ||
    pathname.includes('\\') ||
    pathname.includes('\n') ||
    pathname.includes('\r') ||
    pathname.includes('\t') ||
    pathname.includes('\0')
  ) {
    return '/app?ars_embed=1';
  }
  return `${pathname}?ars_embed=1`;
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
  parentAllowed?: boolean;
}) {
  if (!/\/app\/[a-f0-9-]{36}/i.test(input.pathname)) return true;
  return Boolean(input.inIframe && input.parentAllowed);
}

/**
 * A stored workspace redirect is only for an iframe whose parent is the hub.
 * `ars_embed=1` on a top-level login is not that parent.
 * A foreign referrer is never upgraded by a previously stored hub origin.
 */
export function embedWorkspaceParentAllowed(input: {
  inIframe: boolean;
  referrer: string;
  origin: string;
  storedParent?: string | null;
  allowlisted: (origin: string) => boolean;
}) {
  if (!input.inIframe) return false;
  if (!input.referrer) return Boolean(input.storedParent && input.allowlisted(input.storedParent));
  try {
    const url = new URL(input.referrer);
    if (url.username || url.password) return false;
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    if (input.allowlisted(url.origin)) return true;
    if (url.origin !== input.origin) return false;
  } catch {
    return false;
  }
  return Boolean(input.storedParent && input.allowlisted(input.storedParent));
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

let embedRestoreCount = 0;
const embedRestoreListeners = new Set<() => void>();

function retainEmbedRestore() {
  embedRestoreCount += 1;
  return () => {
    embedRestoreCount -= 1;
    if (embedRestoreCount === 0) {
      embedRestoreListeners.forEach((listener) => listener());
    }
  };
}

export function isEmbedRestorePending() {
  return embedRestoreCount > 0;
}

export function subscribeEmbedRestore(listener: () => void) {
  embedRestoreListeners.add(listener);
  return () => {
    embedRestoreListeners.delete(listener);
  };
}

export async function restoreEmbedSession(input: {
  hasToken: boolean;
  cookie: string | (() => string);
  refresh: (token: string) => Promise<unknown>;
  hasStorageAccess?: () => Promise<boolean>;
  requestStorageAccess?: () => Promise<void>;
}): Promise<'ready' | 'restored' | 'missing'> {
  const release = retainEmbedRestore();
  try {
    if (input.hasToken) return 'ready';
    const readRefreshToken = () => {
      const cookie = typeof input.cookie === 'function' ? input.cookie() : input.cookie;
      return parseEmbedRefreshCookie(cookie);
    };
    // Read before storage-access awaits. Logout on an unauthenticated /app
    // route can clear the cookie while this function is yielded.
    const snapshottedToken = readRefreshToken();
    try {
      if (input.hasStorageAccess && !(await input.hasStorageAccess())) {
        /* Storage Access requires a user gesture; pointerdown retries restore. */
      }
    } catch {
      /* Storage Access API is best-effort after the first-party Connect visit. */
    }
    const refreshToken = readRefreshToken() ?? snapshottedToken;
    if (!refreshToken) return 'missing';
    await input.refresh(refreshToken);
    return 'restored';
  } finally {
    release();
  }
}
