import {
  EMBED_REFRESH_COOKIE,
  embedReturnPath,
  parseEmbedRefreshCookie,
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
  it('returns to the Workspace document after a login bounce', () => {
    expect(
      embedReturnPath(
        '/login',
        'https://workspace.example/app/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222?ars_embed=1',
        'https://workspace.example'
      )
    ).toBe(
      '/app/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222?ars_embed=1'
    );
    expect(
      embedReturnPath('/app/ws/view', '', 'https://workspace.example', '?ars_embed=1')
    ).toBe('/app/ws/view?ars_embed=1');
    expect(embedReturnPath('/login', 'https://evil.example/app/x', 'https://workspace.example')).toBe(
      '/app'
    );
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
