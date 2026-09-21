const UUID = /^[a-f0-9-]{36}$/i;

export const ARS_PARENT_ORIGIN = 'https://africanresearchsociety.org';
export const ARS_HUB_PARENT_KEY = 'ars_hub_parent';
const ARS_PARENT_ORIGINS = new Set([
  ARS_PARENT_ORIGIN,
  'https://www.africanresearchsociety.org',
]);

export function documentViewFromPath(path: string): {
  workspaceId: string;
  viewId: string;
} | null {
  const match = /^\/app\/([a-f0-9-]{36})\/([a-f0-9-]{36})\/?$/i.exec(path);
  if (!match || !UUID.test(match[1]) || !UUID.test(match[2])) return null;
  return { workspaceId: match[1], viewId: match[2] };
}

export function resolveArsParentOrigin(input: {
  isIframe: boolean;
  referrer: string;
  search: string;
}): string | null {
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

export function rememberHubParent(
  origin: string | null | undefined,
  storage?: Pick<Storage, 'setItem'> | null
) {
  if (!origin || !storage || !ARS_PARENT_ORIGINS.has(origin)) return;
  storage.setItem(ARS_HUB_PARENT_KEY, origin);
}

export function recalledHubParent(stored?: string | null) {
  return stored && ARS_PARENT_ORIGINS.has(stored) ? stored : null;
}

export function firstPartyHubParent(input: {
  referrer?: string;
  stored?: string | null;
}) {
  return (
    resolveArsParentOrigin({
      isIframe: false,
      referrer: input.referrer ?? '',
      search: '',
    }) ??
    recalledHubParent(input.stored) ??
    ARS_PARENT_ORIGIN
  );
}

export function sendToDesignHandoffHref(input: {
  parentOrigin: string;
  viewId: string;
  workspaceId?: string;
}) {
  if (!ARS_PARENT_ORIGINS.has(input.parentOrigin)) return null;
  if (!UUID.test(input.viewId)) return null;
  if (input.workspaceId && !UUID.test(input.workspaceId)) return null;
  const url = new URL('/dashboard', input.parentOrigin);
  url.searchParams.set('view', input.viewId.toLowerCase());
  if (input.workspaceId) {
    url.searchParams.set('workspace', input.workspaceId.toLowerCase());
  }
  return url.toString();
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
