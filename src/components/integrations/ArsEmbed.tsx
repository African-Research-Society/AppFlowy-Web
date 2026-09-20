import { useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import {
  EMBED_PARENT_KEY,
  EMBED_PATH_KEY,
  embedReturnPath,
  recalledEmbedParent,
  rememberEmbedContext,
  restoreEmbedSession,
} from '@/application/session/embed-session';
import { EventType, on } from '@/application/session/event';
import { invalidToken, isTokenValid } from '@/application/session/token';
import { refreshToken } from '@/application/services/js-services/http/gotrue';
import { ThemeModeContext } from '@/components/main/useAppThemeMode';

import {
  ARS_PARENT_ORIGIN,
  isArsParentOrigin,
  resolveArsParentOrigin,
} from './send-to-design';

export { ARS_PARENT_ORIGIN };

function savedEmbedPath() {
  try {
    return sessionStorage.getItem(EMBED_PATH_KEY);
  } catch {
    return null;
  }
}

export function ArsEmbed() {
  const location = useLocation();
  const setDark = useContext(ThemeModeContext)?.setDark;

  useEffect(() => {
    const inIframe = window.parent !== window;
    let parentOrigin = resolveArsParentOrigin({
      isIframe: inIframe,
      referrer: document.referrer,
      search: location.search,
    });
    if (!parentOrigin && inIframe) {
      try {
        parentOrigin = recalledEmbedParent(sessionStorage.getItem(EMBED_PARENT_KEY), isArsParentOrigin);
      } catch {
        /* sessionStorage can be unavailable in privacy-restricted iframe contexts. */
      }
    }
    const waiting =
      !parentOrigin && inIframe && new URLSearchParams(location.search).get('ars_embed') === '1';
    if (!parentOrigin && !waiting) {
      delete document.documentElement.dataset.arsEmbed;
      delete document.documentElement.dataset.arsParent;
      return;
    }
    const bind = (origin: string) => {
      parentOrigin = origin;
      document.documentElement.dataset.arsEmbed = 'true';
      document.documentElement.dataset.arsParent = origin;
      rememberEmbedContext({
        parent: origin,
        path: location.pathname,
        search: location.search,
        storage: sessionStorage,
      });
    };
    if (parentOrigin) bind(parentOrigin);
    if (location.pathname.startsWith('/app')) {
      rememberEmbedContext({
        path: location.pathname,
        search: location.search,
        storage: sessionStorage,
      });
    }
    const send = (type: string, extra = {}) => {
      if (!parentOrigin) return;
      window.parent.postMessage({ channel: 'ars-app', version: 1, type, ...extra }, parentOrigin);
    };
    let restoreOutcome: 'ready' | 'restored' | 'missing' | null = null;
    const onAppPath = location.pathname === '/app' || location.pathname.startsWith('/app/');
    const announce = () => {
      if (restoreOutcome === 'missing') {
        send('session-expired');
        return;
      }
      if (restoreOutcome !== 'ready' && restoreOutcome !== 'restored') return;
      if (onAppPath) {
        send('ready');
        if (location.pathname.startsWith('/app/')) send('navigation', { path: location.pathname });
      }
    };
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || event.data?.channel !== 'ars-app' || event.data.version !== 1) return;
      if (!parentOrigin) {
        if (event.data.type === 'hello' && isArsParentOrigin(event.origin)) {
          bind(event.origin);
          announce();
        }
        return;
      }
      if (event.origin !== parentOrigin) return;
      if (event.data.type === 'hello') announce();
      if (event.data.type === 'sign-out') invalidToken();
      if (event.data.type === 'theme' && ['dark', 'light'].includes(event.data.theme)) {
        setDark?.(event.data.theme === 'dark');
      }
    };

    const off = on(EventType.SESSION_INVALID, () => send('session-expired'));
    const expired = on(EventType.SESSION_EXPIRED, () => send('session-expired'));
    const restore = () =>
      restoreEmbedSession({
        hasToken: isTokenValid(),
        cookie: () => document.cookie,
        refresh: (token) => refreshToken(token),
        hasStorageAccess: document.hasStorageAccess?.bind(document),
      });
    const requestAccess = () => {
      void (async () => {
        try {
          await document.requestStorageAccess?.();
        } catch {
          /* Storage Access API is best-effort after the first-party Connect visit. */
        }
        if (cancelled || (restoreOutcome !== 'missing' && restoreOutcome !== null)) return;
        const outcome = await restore();
        if (cancelled) return;
        restoreOutcome = outcome;
        if (outcome === 'restored' || (outcome === 'ready' && location.pathname === '/login')) {
          window.location.replace(
            embedReturnPath({
              pathname: location.pathname,
              referrer: document.referrer,
              origin: window.location.origin,
              search: location.search,
              inIframe,
              savedPath: savedEmbedPath(),
            })
          );
          return;
        }
        announce();
      })();
    };

    window.addEventListener('message', receive);
    window.addEventListener('pointerdown', requestAccess, { once: true });
    let cancelled = false;
    void restore()
      .then((outcome) => {
        if (cancelled) return;
        restoreOutcome = outcome;
        if (outcome === 'restored' || (outcome === 'ready' && location.pathname === '/login')) {
          window.location.replace(
            embedReturnPath({
              pathname: location.pathname,
              referrer: document.referrer,
              origin: window.location.origin,
              search: location.search,
              inIframe,
              savedPath: savedEmbedPath(),
            })
          );
          return;
        }
        announce();
      })
      .catch(() => {
        if (cancelled) return;
        restoreOutcome = 'missing';
        announce();
      });
    return () => {
      cancelled = true;
      off();
      expired();
      window.removeEventListener('message', receive);
      window.removeEventListener('pointerdown', requestAccess);
    };
  }, [location.pathname, location.search, setDark]);

  return null;
}
