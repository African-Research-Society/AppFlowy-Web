import {
  allowEmbedWorkspaceRedirect,
  EMBED_PARENT_KEY,
  EMBED_PATH_KEY,
  EMBED_REFRESH_COOKIE,
  embedReturnPath,
  parseEmbedRefreshCookie,
  recalledEmbedParent,
  rememberEmbedContext,
  restoreEmbedSession,
  serializeEmbedRefreshCookie,
} from '../embed-session';

describe('embed refresh cookie', () => {
  it('writes a third-party cookie on https and never includes the access token', () => {
    const cookie = serializeEmbedRefreshCookie('refresh-token', 'https:');
    expect(cookie).toContain(`${EMBED_REFRESH_COOKIE}=refresh-token`);
    expect(cookie).toContain('SameSite=None');
    expect(cookie).toContain('Secure');
    expect(cookie).not.toMatch(/access|SECRET/i);
    expect(parseEmbedRefreshCookie(cookie!)).toBe('refresh-token');
    expect(serializeEmbedRefreshCookie('a'.repeat(4000), 'https:')).toBeNull();
  });
});

describe('embedReturnPath', () => {
  const workspace =
    '/app/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222';

  it('returns to the Workspace document after a login bounce', () => {
    expect(
      embedReturnPath({
        pathname: '/login',
        referrer: `https://workspace.example${workspace}?ars_embed=1`,
        origin: 'https://workspace.example',
      })
    ).toBe(`${workspace}?ars_embed=1`);
    expect(
      embedReturnPath({
        pathname: '/app/ws/view',
        referrer: '',
        origin: 'https://workspace.example',
        search: '?ars_embed=1',
      })
    ).toBe('/app/ws/view?ars_embed=1');
    expect(
      embedReturnPath({
        pathname: '/login',
        referrer: 'https://evil.example/app/x',
        origin: 'https://workspace.example',
      })
    ).toBe('/app');
  });

  it('keeps the embed query when the login referrer is the ARS parent', () => {
    expect(
      embedReturnPath({
        pathname: '/login',
        referrer: 'https://africanresearchsociety.org/dashboard/workspace',
        origin: 'https://workspace.example',
        inIframe: true,
        savedPath: `${workspace}?ars_embed=1`,
      })
    ).toBe(`${workspace}?ars_embed=1`);
    expect(
      embedReturnPath({
        pathname: '/login',
        referrer: 'https://africanresearchsociety.org/dashboard/workspace',
        origin: 'https://workspace.example',
        inIframe: true,
      })
    ).toBe('/app?ars_embed=1');
  });
});

describe('rememberEmbedContext', () => {
  it('stores an allowlisted parent and an embed workspace path', () => {
    const store = new Map<string, string>();
    rememberEmbedContext({
      parent: 'https://www.africanresearchsociety.org',
      path: '/app/ws/view',
      search: '',
      storage: { setItem: (key, value) => store.set(key, value) },
    });
    expect(store.get(EMBED_PARENT_KEY)).toBe('https://www.africanresearchsociety.org');
    expect(store.get(EMBED_PATH_KEY)).toBe('/app/ws/view?ars_embed=1');
    expect(
      recalledEmbedParent(store.get(EMBED_PARENT_KEY), (origin) => origin.endsWith('africanresearchsociety.org'))
    ).toBe('https://www.africanresearchsociety.org');
    expect(recalledEmbedParent('https://evil.example', () => false)).toBeNull();
  });
});

describe('allowEmbedWorkspaceRedirect', () => {
  it('allows a workspace path only inside the embed', () => {
    expect(
      allowEmbedWorkspaceRedirect({
        pathname: '/app/11111111-1111-4111-8111-111111111111',
      })
    ).toBe(false);
    expect(
      allowEmbedWorkspaceRedirect({
        pathname: '/app/11111111-1111-4111-8111-111111111111',
        search: '?ars_embed=1',
      })
    ).toBe(true);
    expect(
      allowEmbedWorkspaceRedirect({
        pathname: '/app/11111111-1111-4111-8111-111111111111',
        inIframe: true,
      })
    ).toBe(true);
    expect(allowEmbedWorkspaceRedirect({ pathname: '/settings' })).toBe(true);
  });
});

describe('restoreEmbedSession', () => {
  it('refreshes from the cookie after storage access and does not invent a token', async () => {
    const refresh = jest.fn(async () => undefined);
    const requestStorageAccess = jest.fn(async () => undefined);
    await expect(
      restoreEmbedSession({
        hasToken: true,
        cookie: () => `${EMBED_REFRESH_COOKIE}=refresh-token`,
        refresh,
      })
    ).resolves.toBe('ready');
    expect(refresh).not.toHaveBeenCalled();
    let jar = '';
    await expect(
      restoreEmbedSession({
        hasToken: false,
        cookie: () => jar,
        refresh,
        hasStorageAccess: async () => false,
        requestStorageAccess: async () => {
          jar = `${EMBED_REFRESH_COOKIE}=refresh-token`;
          await requestStorageAccess();
        },
      })
    ).resolves.toBe('restored');
    expect(requestStorageAccess).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledWith('refresh-token');
    await expect(
      restoreEmbedSession({
        hasToken: false,
        cookie: '',
        refresh,
      })
    ).resolves.toBe('missing');
  });
});
