const UUID = /^[a-f0-9-]{36}$/;

export function documentViewFromPath(path: string): {
  workspaceId: string;
  viewId: string;
} | null {
  const match = /^\/app\/([a-f0-9-]{36})\/([a-f0-9-]{36})$/.exec(path);
  if (!match) return null;
  return { workspaceId: match[1], viewId: match[2] };
}

export function buildSendToDesignMessage(input: {
  viewId: string;
  title?: string;
}) {
  if (!UUID.test(input.viewId)) throw new Error('Invalid view');
  return {
    channel: 'ars-app' as const,
    version: 1 as const,
    type: 'send-to-design' as const,
    viewId: input.viewId,
    title: (input.title ?? 'Untitled brief').trim().slice(0, 200) || 'Untitled brief',
  };
}
