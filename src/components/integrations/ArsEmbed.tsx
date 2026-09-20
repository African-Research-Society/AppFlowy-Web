import { useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { EventType, on } from '@/application/session/event';
import { invalidToken } from '@/application/session/token';
import { ThemeModeContext } from '@/components/main/useAppThemeMode';

import { ARS_PARENT_ORIGIN, resolveArsParentOrigin } from './send-to-design';

export { ARS_PARENT_ORIGIN };

export function ArsEmbed() {
  const location = useLocation();
  const setDark = useContext(ThemeModeContext)?.setDark;

  useEffect(() => {
    const parentOrigin = resolveArsParentOrigin({
      isIframe: window.parent !== window,
      referrer: document.referrer,
      search: location.search,
    });
    if (!parentOrigin) {
      delete document.documentElement.dataset.arsEmbed;
      delete document.documentElement.dataset.arsParent;
      return;
    }
    document.documentElement.dataset.arsEmbed = 'true';
    document.documentElement.dataset.arsParent = parentOrigin;
    const send = (type: string, extra = {}) =>
      window.parent.postMessage({ channel: 'ars-app', version: 1, type, ...extra }, parentOrigin);
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== parentOrigin ||
        event.source !== window.parent ||
        event.data?.channel !== 'ars-app' ||
        event.data.version !== 1
      )
        return;
      if (event.data.type === 'sign-out') invalidToken();
      if (event.data.type === 'theme' && ['dark', 'light'].includes(event.data.theme)) {
        setDark?.(event.data.theme === 'dark');
      }
    };

    const off = on(EventType.SESSION_INVALID, () => send('session-expired'));
    const expired = on(EventType.SESSION_EXPIRED, () => send('session-expired'));

    window.addEventListener('message', receive);
    if (location.pathname.startsWith('/app/')) {
      send('ready');
      send('navigation', { path: location.pathname });
    }

    if (location.pathname === '/login') send('session-expired');
    return () => {
      off();
      expired();
      window.removeEventListener('message', receive);
    };
  }, [location.pathname, location.search, setDark]);

  return null;
}
