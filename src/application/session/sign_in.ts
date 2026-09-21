import {
  allowEmbedWorkspaceRedirect,
  EMBED_PARENT_KEY,
  EMBED_PATH_KEY,
  embedReturnPath,
  embedWorkspaceParentAllowed,
  withEmbedQuery,
} from '@/application/session/embed-session';
import { arsReturnOrigin, isArsParentOrigin, rememberHubParent } from '@/components/integrations/send-to-design';
import { Log } from '@/utils/log';

export function saveRedirectTo(redirectTo: string) {
  const safeRedirectTo = getSafeRedirectUrl(redirectTo);

  if (safeRedirectTo) {
    localStorage.setItem('redirectTo', safeRedirectTo);
  } else {
    clearRedirectTo();
  }
}

export function getRedirectTo() {
  return localStorage.getItem('redirectTo');
}

export function clearRedirectTo() {
  localStorage.removeItem('redirectTo');
}

export const AUTH_CALLBACK_PATH = '/auth/callback';
export const AUTH_CALLBACK_URL = `${window.location.origin}${AUTH_CALLBACK_PATH}`;

const MAX_REDIRECT_VALIDATION_DECODES = 5;
const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+.-]*:/i;
const AUTHORITY_RELATIVE_URL_PATTERN = /^[\\/]{2}/;

export interface LoginUrlParams {
  action?: string;
  email?: string;
  force?: boolean;
  redirectTo?: string;
  type?: string;
}

export function withSignIn() {
  return function (
    // eslint-disable-next-line
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    // eslint-disable-next-line
    descriptor.value = async function (args: { redirectTo: string }) {
      const redirectTo = args.redirectTo;

      saveRedirectTo(redirectTo);

      try {
        await originalMethod.apply(this, [args]);
      } catch (e) {
        console.error(e);
        return Promise.reject(e);
      }
    };

    return descriptor;
  };
}

/**
 * Returns the original redirect value only when every valid decoding layer
 * remains a root-relative or same-origin URL. The value itself is deliberately
 * not decoded: URLSearchParams already decodes query values, and decoding again
 * can turn data such as "%2F%5Cevil.com" into an external redirect.
 */
export function getSafeRedirectUrl(value: string): string | null {
  if (!value) return null;

  let candidate = value;

  for (let decodeCount = 0; decodeCount <= MAX_REDIRECT_VALIDATION_DECODES; decodeCount += 1) {
    const isRootRelative = candidate.startsWith('/') && !AUTHORITY_RELATIVE_URL_PATTERN.test(candidate);
    const isAbsolute = ABSOLUTE_URL_PATTERN.test(candidate);

    if (!isRootRelative && !isAbsolute) return null;

    try {
      const parsed = new URL(candidate, window.location.origin);

      if (parsed.origin !== window.location.origin) return null;
    } catch {
      return null;
    }

    let decoded: string;

    try {
      decoded = decodeURIComponent(candidate);
    } catch {
      // The redirect is never decoded for navigation. If another decoding pass
      // is not valid, the already-parsed same-origin value cannot become an
      // authority URL through that pass.
      return value;
    }

    if (decoded === candidate) return value;

    candidate = decoded;
  }

  // Reject unusually deep encodings instead of guessing how another layer may
  // interpret them later.
  return null;
}

export function isSafeRedirectUrl(url: string): boolean {
  return getSafeRedirectUrl(url) !== null;
}

/**
 * Builds an internal login URL without allowing values to alter the surrounding
 * query string. Callers must pass raw values; URLSearchParams owns the encoding.
 */
export function buildLoginUrl(params: LoginUrlParams = {}): string {
  const search = new URLSearchParams();
  const safeRedirectTo = params.redirectTo ? getSafeRedirectUrl(params.redirectTo) : null;

  if (params.action) search.set('action', params.action);
  if (params.email) search.set('email', params.email);
  if (safeRedirectTo) search.set('redirectTo', safeRedirectTo);
  if (params.type) search.set('type', params.type);
  if (params.force !== undefined) search.set('force', String(params.force));

  const query = search.toString();

  return query ? `/login?${query}` : '/login';
}

export function afterAuth() {
  // A fixed ARS origin and fixed dashboard route avoid extending the general
  // redirect allowlist. Never carry the callback's token fragment back to ARS.
  const callback = new URL(window.location.href);
  const arsTeam = callback.searchParams.get('ars_team');

  if (callback.pathname === AUTH_CALLBACK_PATH && callback.searchParams.get('ars_notes') === '1') {
    const path = callback.searchParams.get('ars_path');
    try {
      rememberHubParent(arsReturnOrigin(callback.searchParams.get('ars_origin')), sessionStorage);
    } catch {
      /* sessionStorage can be unavailable in privacy-restricted contexts. */
    }
    clearRedirectTo();
    window.location.replace(
      path && /^\/app\/[a-f0-9-]{36}(?:\/[a-f0-9-]{36})?$/i.test(path) ? path : '/app'
    );
    return;
  }

  if (callback.pathname === AUTH_CALLBACK_PATH && arsTeam && /^[a-f0-9-]{36}$/.test(arsTeam)) {
    const back = new URL(
      '/dashboard/workspace',
      arsReturnOrigin(callback.searchParams.get('ars_origin'))
    );

    back.searchParams.set('team', arsTeam);
    back.searchParams.set('connected', '1');
    const path = callback.searchParams.get('ars_path');

    if (path && /^\/(?!\/)[A-Za-z0-9/_-]*$/.test(path)) back.searchParams.set('path', path);
    clearRedirectTo();
    window.location.replace(back.toString());
    return;
  }

  const redirectTo = getRedirectTo();
  const inIframe = window.self !== window.top;
  let savedPath: string | null = null;
  let storedParent: string | null = null;
  try {
    savedPath = sessionStorage.getItem(EMBED_PATH_KEY);
    storedParent = sessionStorage.getItem(EMBED_PARENT_KEY);
  } catch {
    savedPath = null;
    storedParent = null;
  }
  const parentAllowed = embedWorkspaceParentAllowed({
    inIframe,
    referrer: document.referrer,
    origin: window.location.origin,
    storedParent,
    allowlisted: isArsParentOrigin,
  });

  clearRedirectTo();

  if (redirectTo) {
    const safeRedirectTo = getSafeRedirectUrl(redirectTo);

    if (!safeRedirectTo) {
      window.location.href = inIframe ? '/app?ars_embed=1' : '/app';
      return;
    }

    const url = new URL(safeRedirectTo, window.location.origin);
    const pathname = url.pathname;

    // Check if URL contains workspace/view UUIDs (user-specific paths)
    // Pattern matches /app/{uuid}/{uuid} or /app/{uuid}
    const hasUserSpecificIds = /\/app\/[a-f0-9-]{36}/i.test(pathname);

    if (hasUserSpecificIds) {
      if (
        allowEmbedWorkspaceRedirect({
          pathname,
          search: url.search,
          inIframe,
          parentAllowed,
        })
      ) {
        const next = withEmbedQuery(url.pathname, url.search);
        Log.info('[Auth] afterAuth: following embedded workspace path', { pathname });
        window.location.href = next;
      } else {
        // Don't redirect to user-specific pages from previous sessions
        Log.info('[Auth] afterAuth: blocking user-specific redirect, going to /app', { pathname });
        window.location.href = '/app';
      }
    } else if (pathname === '/' || !pathname) {
      // Preserve query params and hash but redirect to /app path
      url.pathname = '/app';
      Log.info('[Auth] afterAuth: root path redirect, going to /app');
      window.location.href = url.toString();
    } else {
      Log.info('[Auth] afterAuth: redirecting to saved destination', { pathname });
      window.location.href = safeRedirectTo;
    }
  } else if (inIframe) {
    window.location.href = embedReturnPath({
      pathname: '/login',
      referrer: document.referrer,
      origin: window.location.origin,
      inIframe: true,
      savedPath,
    });
  } else {
    Log.info('[Auth] afterAuth: no redirectTo saved, going to /app');
    window.location.href = '/app';
  }
}
