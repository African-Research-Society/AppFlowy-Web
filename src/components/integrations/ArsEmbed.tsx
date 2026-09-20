import { useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { embedReturnPath, restoreEmbedSession } from '@/application/session/embed-session';
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

export function ArsEmbed() {
  const location = useLocation();
  const setDark = useContext(ThemeModeContext)?.setDark;

  useEffect(() => {
    let parentOrigin = resolveArsParentOrigin({
      isIframe: window.parent !== window,
      referrer: document.referrer,
      search: location.search,
    });
    const waiting =
      !parentOrigin &&
      window.parent !== window &&
      new URLSearchParams(location.search).get('ars_embed') === '1';
    if (!parentOrigin && !waiting) {
      delete document.documentElement.dataset.arsEmbed;
      delete document.documentElement.dataset.arsParent;
      return;
    }
    const bind = (origin: string) => {
      parentOrigin = origin;
      document.documentElement.dataset.arsEmbed = 'true';
      document.documentElement.dataset.arsParent = origin;
    };
    if (parentOrigin) bind(parentOrigin);
    const send = (type: string, extra = {}) => {
      if (!parentOrigin) return;
      window.parent.postMessage({ channel: 'ars-app', version: 1, type, ...extra }, parentOrigin);
    };
    const announce = () => {
      if (location.pathname.startsWith('/app/')) {
        send('ready');
        send('navigation', { path: location.pathname });
      }
      if (location.pathname === '/login') send('session-expired');
    };
    const receive = (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        event.data?.channel !== 'ars-app' ||
        event.data.version !== 1
      )
        return;
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

    window.addEventListener('message', receive);
    let cancelled = false;
    void restoreEmbedSession({
      hasToken: isTokenValid(),
      cookie: () => document.cookie,
      refresh: (token) => refreshToken(token),
      hasStorageAccess: document.hasStorageAccess?.bind(document),
      requestStorageAccess: document.requestStorageAccess?.bind(document),
    })
      .then((outcome) => {
        if (cancelled) return;
        if (outcome === 'restored') {
          window.location.replace(
            embedReturnPath(
              location.pathname,
              document.referrer,
              window.location.origin,
              location.search
            )
          );
          return;
        }
        announce();
      })
      .catch(() => {
        if (cancelled) return;
        if (location.pathname === '/login') send('session-expired');
      });
    return () => {
      cancelled = true;
      off();
      expired();
      window.removeEventListener('message', receive);
    };
  }, [location.pathname, location.search, setDark]);

  return null;
}
