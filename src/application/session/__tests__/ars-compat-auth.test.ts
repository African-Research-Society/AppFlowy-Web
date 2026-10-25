import { beforeAll, beforeEach, expect, it } from '@jest/globals';
import { completeArsLogin, exchangeArsToken } from '../ars-auth';
import { refreshToken } from '@/application/services/js-services/http/gotrue';
import { getTokenParsed, refreshToken as saveSession } from '../token';
import { arsSocketAccessToken } from '../ars-socket';

jest.mock('../token', () => ({
  getTokenParsed: jest.fn(() => null),
  refreshToken: jest.fn(),
  invalidToken: jest.fn(),
}));

const session = {
  access_token: 'access', refresh_token: 'refresh-next',
  expires_at: Math.floor(Date.now() / 1000) + 300,
  user: { id: 'b20b684e-bef9-47d8-ba6f-0cbb743d7b93', email: 'member@example.test' },
};
const flow = { verifier: 'verifier', nonce: 'nonce', state: 'valid-state', createdAt: Date.now(), team: '0170866b-28cf-4884-bede-140887581093', path: '/app/9127bbb2-f49d-41e9-ad86-5dc036911f44' };
const callback = () => new URL('http://localhost/auth/callback?code=one-time-code&state=valid-state');

beforeAll(() => {
  Object.defineProperty(AbortSignal, 'timeout', { configurable: true, value: () => new AbortController().signal });
});

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  sessionStorage.setItem('ars-oidc-flow', JSON.stringify({ ...flow, createdAt: Date.now() }));
  (getTokenParsed as jest.Mock).mockReturnValue(null);
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => session });
});

it('rejects mismatched callback state before sending the authorization code', async () => {
  const url = callback(); url.searchParams.set('state', 'wrong-state');
  await expect(completeArsLogin(url)).rejects.toThrow('Invalid sign-in state');
  expect(fetch).not.toHaveBeenCalled();
});

it.each([Date.now() - 11 * 60 * 1000, Date.now() + 60 * 1000])('rejects expired or future sign-in flows (%s)', async (createdAt) => {
  sessionStorage.setItem('ars-oidc-flow', JSON.stringify({ ...flow, createdAt }));
  await expect(completeArsLogin(callback())).rejects.toThrow('Invalid sign-in state');
  expect(fetch).not.toHaveBeenCalled();
});

it('completes PKCE sign-in once and removes authorization material from the URL', async () => {
  await expect(completeArsLogin(callback())).resolves.toEqual(session);
  expect(fetch).toHaveBeenCalledWith('https://africanresearchsociety.org/api/integrations/appflowy/token', expect.objectContaining({ credentials: 'omit', body: JSON.stringify({ code: 'one-time-code', code_verifier: 'verifier', nonce: 'nonce' }) }));
  expect(saveSession).toHaveBeenCalledWith(JSON.stringify(session));
  expect(window.location.search).not.toContain('code=');
  expect(window.location.search).not.toContain('state=');
  expect(new URLSearchParams(window.location.search).get('ars_team')).toBe(flow.team);
  await expect(completeArsLogin(callback())).rejects.toThrow('Sign-in has expired');
});

it('does not save malformed session responses', async () => {
  (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ access_token: 'partial' }) });
  await expect(completeArsLogin(callback())).rejects.toThrow('Invalid ARS session response');
  expect(saveSession).not.toHaveBeenCalled();
});

it('deduplicates concurrent requests that rotate the same refresh token', async () => {
  const sessions = await Promise.all([refreshToken('refresh-old'), refreshToken('refresh-old'), refreshToken('refresh-old')]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(saveSession).toHaveBeenCalledTimes(1);
  expect(sessions).toEqual([session, session, session]);
  (getTokenParsed as jest.Mock).mockReturnValue(session);
  await expect(refreshToken('refresh-old')).resolves.toEqual(session);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('fails closed when ARS rejects a revoked session', async () => {
  (fetch as jest.Mock).mockResolvedValue({ ok: false });
  await expect(exchangeArsToken({ refresh_token: 'revoked' })).rejects.toThrow('Your ARS session expired');
  expect(saveSession).not.toHaveBeenCalled();
});

it('refreshes an expired socket token before producing a connection URL', async () => {
  (getTokenParsed as jest.Mock).mockReturnValue({ ...session, access_token: 'expired-access', refresh_token: 'refresh-old', expires_at: Date.now() / 1000 - 1 });
  await expect(arsSocketAccessToken()).resolves.toBe('access');
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(saveSession).toHaveBeenCalledWith(JSON.stringify(session));
});

it('reuses an unexpired socket token without rotating the refresh token', async () => {
  (getTokenParsed as jest.Mock).mockReturnValue(session);
  await expect(arsSocketAccessToken()).resolves.toBe('access');
  expect(fetch).not.toHaveBeenCalled();
});

it('rejects a socket connection when its ARS session is missing', async () => {
  await expect(arsSocketAccessToken()).rejects.toThrow('ARS session unavailable');
  expect(fetch).not.toHaveBeenCalled();
});
