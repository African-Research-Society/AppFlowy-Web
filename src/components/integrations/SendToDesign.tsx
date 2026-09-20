import { useEffect, useState } from 'react';

import { ViewLayout } from '@/application/types';
import { useAppView, useAppViewId } from '@/components/app/app.hooks';

import { arsPostMessageOrigin, buildSendToDesignMessage } from './send-to-design';

export function SendToDesign() {
  const viewId = useAppViewId();
  const view = useAppView(viewId);
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    const sync = () => setEmbedded(document.documentElement.dataset.arsEmbed === 'true');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ars-embed'] });
    return () => observer.disconnect();
  }, []);

  if (!embedded || !viewId || view?.layout !== ViewLayout.Document) return null;
  return (
    <button
      type='button'
      data-testid='ars-send-to-design'
      onClick={() => {
        window.parent.postMessage(
          buildSendToDesignMessage({
            viewId,
            title: view.name,
          }),
          arsPostMessageOrigin(document.documentElement.dataset.arsParent)
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
