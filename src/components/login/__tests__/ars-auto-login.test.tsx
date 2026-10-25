import { beforeEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { startArsLogin } from '@/application/session/ars-auth';
import { Login } from '../Login';

jest.mock('@/application/session/ars-auth', () => ({ startArsLogin: jest.fn() }));
const start = jest.mocked(startArsLogin);
const team = '0170866b-28cf-4884-bede-140887581093';

beforeEach(() => {
  jest.clearAllMocks();
  start.mockResolvedValue(undefined);
  window.history.replaceState(null, '', `/login?ars_auto=1&ars_team=${team}`);
});
it('starts a dashboard handoff only once in Strict Mode', () => {
  render(<StrictMode><Login redirectTo='' /></StrictMode>);
  expect(start).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('status').textContent).toContain('Opening Workspace');
  expect(screen.queryByRole('button')).toBeNull();
});
it('keeps ordinary direct sign-in available without starting automatically', () => {
  window.history.replaceState(null, '', '/login');
  render(<Login redirectTo='' />);
  expect(start).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Continue with ARS' }));
  expect(start).toHaveBeenCalledTimes(1);
});
it('offers a manual retry after an automatic sign-in failure without looping', async () => {
  start.mockRejectedValueOnce(new Error('network unavailable'));
  render(<Login redirectTo='' />);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Please try again'));
  expect(start).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Continue with ARS' }));
  expect(start).toHaveBeenCalledTimes(2);
});
