import { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { EventType, on } from '@/application/session/event';
import { invalidToken } from '@/application/session/token';
import { ThemeModeContext } from '@/components/main/useAppThemeMode';

import { buildSendToDesignMessage, documentViewFromPath } from './send-to-design';

export const ARS_PARENT_ORIGIN = 'https://africanresearchsociety.org';
export function ArsEmbed() {
  const location = useLocation();
  const setDark = useContext(ThemeModeContext)?.setDark;
  const [embedded, setEmbedded] = useState(false);
  const view = documentViewFromPath(location.pathname);

  useEffect(() => {
    if (window.parent === window || !document.referrer || new URL(document.referrer).origin !== ARS_PARENT_ORIGIN) return;
    document.documentElement.dataset.arsEmbed = 'true';
    setEmbedded(true);
    const send = (type: string, extra = {}) => window.parent.postMessage({ channel: 'ars-app', version: 1, type, ...extra }, ARS_PARENT_ORIGIN);
    const receive = (event: MessageEvent) => {
      if (event.origin !== ARS_PARENT_ORIGIN || event.source !== window.parent || event.data?.channel !== 'ars-app' || event.data.version !== 1) return;
      if (event.data.type === 'sign-out') invalidToken();
      if (event.data.type === 'theme' && ['dark', 'light'].includes(event.data.theme)) {
        setDark?.(event.data.theme === 'dark');
      }
    };

    const off = on(EventType.SESSION_INVALID, () => send('session-expired'));
    const expired = on(EventType.SESSION_EXPIRED, () => send('session-expired'));

    window.addEventListener('message', receive);
    if (location.pathname.startsWith('/app/')) { send('ready'); send('navigation', { path: location.pathname }); }

    if (location.pathname === '/login') send('session-expired');
    return () => { off(); expired(); window.removeEventListener('message', receive); delete document.documentElement.dataset.arsEmbed; setEmbedded(false); };
  }, [location.pathname, setDark]);

  if (!embedded || !view) return null;
  return (
    <button
      type='button'
      data-testid='ars-send-to-design'
      onClick={() => {
        window.parent.postMessage(
          buildSendToDesignMessage({
            viewId: view.viewId,
            title: document.title.replace(/\s*[·|].*$/, '').trim() || 'Untitled brief',
          }),
          ARS_PARENT_ORIGIN
        );
      }}
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 40,
        border: 0,
        borderRadius: 8,
        padding: '8px 12px',
        background: '#f4f0e6',
        color: '#17161b',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      Create design from this page
    </button>
  );
}
