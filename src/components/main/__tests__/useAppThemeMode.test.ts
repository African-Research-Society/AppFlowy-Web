import { act, renderHook } from '@testing-library/react';

import { useAppThemeMode } from '../useAppThemeMode';

describe('workspace theme', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/login');
    document.documentElement.setAttribute('data-dark-mode', 'false');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() })),
    });
  });

  it('matches the dark ARS host even with a saved light preference and light OS', () => {
    window.history.replaceState(null, '', '/app?ars_embed=1');
    localStorage.setItem('dark-mode', 'false');
    const { result, rerender } = renderHook(() => useAppThemeMode());

    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.getAttribute('data-dark-mode')).toBe('true');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem('dark-mode')).toBe('false');

    window.history.replaceState(null, '', '/app/workspace/document');
    rerender();
    expect(result.current.isDark).toBe(true);
    // The authenticated embed bridge can still apply a host theme message.
    act(() => result.current.setIsDark(false));
    expect(document.documentElement.getAttribute('data-dark-mode')).toBe('false');
    expect(localStorage.getItem('dark-mode')).toBe('false');
  });

  it('honors an explicit light preview without changing the saved preference', () => {
    window.history.replaceState(null, '', '/login?ars_embed=1&theme=light');
    localStorage.setItem('dark-mode', 'true');
    const { result } = renderHook(() => useAppThemeMode());

    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(localStorage.getItem('dark-mode')).toBe('true');
  });

  it('keeps the initial paint and allows standalone theme changes to persist', () => {
    document.documentElement.setAttribute('data-dark-mode', 'true');
    localStorage.setItem('dark-mode', 'true');
    const { result } = renderHook(() => useAppThemeMode());

    expect(result.current.isDark).toBe(true);
    act(() => result.current.setIsDark(false));
    expect(document.documentElement.getAttribute('data-dark-mode')).toBe('false');
    expect(localStorage.getItem('dark-mode')).toBe('false');
  });
});
