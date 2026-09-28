import isFQDN from 'validator/lib/isFQDN';
import isIP from 'validator/lib/isIP';
import isURL from 'validator/lib/isURL';

export const downloadPage = 'https://africanresearchsociety.org';

export const openAppFlowySchema = 'ars-workspace://';

export const iosDownloadLink = 'https://africanresearchsociety.org';
export const androidDownloadLink = 'https://africanresearchsociety.org';

export const desktopDownloadLink = 'https://africanresearchsociety.org';

export function isValidUrl(input: string) {
  return isURL(input, { require_protocol: true, require_host: false });
}

export function isSingleURLText(input: string) {
  const trimmed = input.trim();

  if (!trimmed) return false;
  if (trimmed.split(/\r\n|\r|\n/).filter(Boolean).length !== 1) return false;

  return Boolean(processUrl(trimmed));
}

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const APPFLOWY_PAGE_PATH = new RegExp(`^/app/(${UUID_PATTERN})/(${UUID_PATTERN})/?$`, 'i');
const APPFLOWY_WORKSPACE_PATH = new RegExp(`^/app/(${UUID_PATTERN})(?:/|$)`, 'i');

export interface AppFlowyPageLink {
  workspaceId: string;
  viewId: string;
  blockId?: string;
}

/** Workspace id segment of an /app route pathname, if present. */
export function workspaceIdFromAppPathname(pathname: string): string | undefined {
  return APPFLOWY_WORKSPACE_PATH.exec(pathname)?.[1];
}

/**
 * Resolves a page link hosted by this AppFlowy installation.
 *
 * Keeping this semantic distinction at paste time lets page mentions follow
 * live folder metadata (including database tab renames) instead of freezing
 * the database container's HTML title into an external-link preview.
 *
 * Only URLs a page mention can fully represent qualify: query params other
 * than blockId (e.g. `r` row targets, `v` database tab selection) carry
 * targeting a mention would silently drop, so those URLs stay plain links.
 */
export function parseAppFlowyPageLink(input: string, appHostname: string): AppFlowyPageLink | undefined {
  const normalized = processUrl(input);

  if (!normalized) return;

  try {
    const url = new URL(normalized);

    if (url.hostname !== appHostname) return;

    const match = APPFLOWY_PAGE_PATH.exec(url.pathname);

    if (!match) return;

    for (const key of url.searchParams.keys()) {
      if (key !== 'blockId') return;
    }

    const blockId = url.searchParams.get('blockId')?.trim();

    return {
      workspaceId: match[1],
      viewId: match[2],
      ...(blockId ? { blockId } : {}),
    };
  } catch {
    return;
  }
}

// Process the URL to make sure it's a valid URL
// If it's not a valid URL(eg: 'appflowy.io' or '192.168.1.2'), we'll add 'https://' to the URL
/** Editor marks may keep relative, hash, http(s), mailto, and tel targets. */
export function isPersistableEditorHref(url: string) {
  const value = url.trim();

  if (!value || value.startsWith('//')) return false;

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value);

  if (!scheme) return true;

  return /^(https?|mailto|tel)$/i.test(scheme[1]);
}

export function processUrl(input: string) {
  let processedUrl = input;

  if (isValidUrl(input)) {
    return processedUrl;
  }

  if (/^https?:\/\//i.test(input)) {
    return processedUrl;
  }

  if (input.startsWith('localhost')) {
    return `http://${input}`;
  }

  const domain = input.split('/')[0];

  if (isIP(domain) || isFQDN(domain)) {
    processedUrl = `https://${input}`;
    if (isValidUrl(processedUrl)) {
      return processedUrl;
    }
  }

  return;
}

export async function openUrl(url: string, target: string = '_current') {
  const newUrl = processUrl(url);

  if (!newUrl) return;

  window.open(newUrl, target);
}
