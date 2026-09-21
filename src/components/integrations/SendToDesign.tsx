import { useEffect, useState } from 'react';

import { ViewLayout } from '@/application/types';
import { useAppView, useAppViewId } from '@/components/app/app.hooks';

import {
  arsPostMessageOrigin,
  buildSendToDesignMessage,
  canSendPageToDesign,
  documentViewFromPath,
  sendToDesignHandoffHref,
} from './send-to-design';

export function SendToDesign() {
  const viewId = useAppViewId();
  const view = useAppView(viewId);
  const [parentOrigin, setParentOrigin] = useState<string | null>(null);
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    const sync = () => {
      setEmbedded(document.documentElement.dataset.arsEmbed === 'true');
      setParentOrigin(arsPostMessageOrigin(document.documentElement.dataset.arsParent));
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-ars-embed', 'data-ars-parent'],
    });
    return () => observer.disconnect();
  }, []);

  const pathname = typeof window === 'undefined' ? '' : window.location.pathname;
  if (
    !parentOrigin ||
    !viewId ||
    !canSendPageToDesign({
      parentOrigin,
      viewId,
      isDocument: view ? view.layout === ViewLayout.Document : undefined,
      pathname,
    })
  ) {
    return null;
  }
  return (
    <button
      type='button'
      data-testid='ars-send-to-design'
      onClick={() => {
        try {
          const target = documentViewFromPath(window.location.pathname);
          if (embedded) {
            window.parent.postMessage(
              buildSendToDesignMessage({
                viewId,
                workspaceId: target?.workspaceId,
                title: view?.name,
              }),
              parentOrigin
            );
            return;
          }
          const href = sendToDesignHandoffHref({
            parentOrigin,
            viewId,
            workspaceId: target?.workspaceId,
          });
          if (href) window.location.assign(href);
        } catch {
          /* Invalid page ids must not break the editor. */
        }
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
