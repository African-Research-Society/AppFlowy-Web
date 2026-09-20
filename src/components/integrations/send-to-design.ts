const UUID = /^[a-f0-9-]{36}$/;

export const ARS_PARENT_ORIGIN = 'https://africanresearchsociety.org';
const ARS_PARENT_ORIGINS = new Set([
  ARS_PARENT_ORIGIN,
  'https://www.africanresearchsociety.org',
]);

export function documentViewFromPath(path: string): {
  workspaceId: string;
  viewId: string;
} | null {
  const match = /^\/app\/([a-f0-9-]{36})\/([a-f0-9-]{36})$/.exec(path);
  if (!match || !UUID.test(match[1]) || !UUID.test(match[2])) return null;
  return { workspaceId: match[1], viewId: match[2] };
}

export function resolveArsParentOrigin(input: {
  isIframe: boolean;
  referrer: string;
  search: string;
}): string | null {
  if (!input.isIframe) return null;
  try {
    if (input.referrer) {
      const origin = new URL(input.referrer).origin;
      if (ARS_PARENT_ORIGINS.has(origin)) return origin;
    }
  } catch {
    /* malformed referrer is not an embed signal */
  }
  return null;
}

export function isArsParentOrigin(origin: string) {
  return ARS_PARENT_ORIGINS.has(origin);
}

export function arsReturnOrigin(requested?: string | null) {
  if (requested && ARS_PARENT_ORIGINS.has(requested)) return requested;
  return ARS_PARENT_ORIGIN;
}

export function arsPostMessageOrigin(stored?: string | null) {
  if (stored && ARS_PARENT_ORIGINS.has(stored)) return stored;
  return null;
}

export function sendToDesignTitle(name?: string) {
  const cleaned = (name ?? '').replace(/\s*[·|].*$/, '').trim();
  return cleaned.slice(0, 200) || 'Untitled brief';
}

export function buildSendToDesignMessage(input: {
  viewId: string;
  workspaceId?: string;
  title?: string;
}) {
  if (!UUID.test(input.viewId)) throw new Error('Invalid view');
  if (input.workspaceId && !UUID.test(input.workspaceId)) {
    throw new Error('Invalid workspace');
  }
  return {
    channel: 'ars-app' as const,
    version: 1 as const,
    type: 'send-to-design' as const,
    viewId: input.viewId,
    ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
    title: sendToDesignTitle(input.title),
  };
}
