import { useEffect, useState } from 'react';

import { ViewLayout } from '@/application/types';
import { useAppView, useAppViewId, useCurrentWorkspaceIdOptional } from '@/components/app/app.hooks';

import {
  arsPostMessageOrigin,
  buildSendToDesignMessage,
  canSendPageToDesign,
  sendToDesignHandoffHref,
  sendToDesignWorkspaceId,
} from './send-to-design';

export function SendToDesign() {
  const viewId = useAppViewId();
  const view = useAppView(viewId);
  const workspaceId = useCurrentWorkspaceIdOptional();
  const [parentOrigin, setParentOrigin] = useState<string | null>(null);
  const [embedded, setEmbedded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      workspaceId,
      isDocument: view ? view.layout === ViewLayout.Document : undefined,
      pathname,
    })
  ) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 64,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
    <button
      type='button'
      data-testid='ars-send-to-design'
      onClick={() => {
        try {
          const handoffWorkspace = sendToDesignWorkspaceId({
            workspaceId,
            pathname: window.location.pathname,
          });

          if (!handoffWorkspace) {
            setError('Workspace is required');
            return;
          }

          if (embedded) {
            window.parent.postMessage(
              buildSendToDesignMessage({
                viewId,
                workspaceId: handoffWorkspace,
                title: view?.name,
              }),
              parentOrigin
            );
            return;
          }

          const href = sendToDesignHandoffHref({
            parentOrigin,
            viewId,
            workspaceId: handoffWorkspace,
            title: view?.name,
          });

          if (!href) {
            setError('Could not open Design on the hub');
            return;
          }

          window.location.assign(href);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not open Design on the hub');
        }
      }}
      style={{
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
    {error ? (
      <p
        role='alert'
        style={{
          margin: 0,
          maxWidth: 240,
          color: '#b42318',
          fontSize: 12,
        }}
      >
        {error}
      </p>
    ) : null}
    </div>
  );
}
