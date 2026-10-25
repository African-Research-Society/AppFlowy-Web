import { useEffect, useState, createContext, useCallback } from 'react';

import { createHotkey, HOT_KEY_NAME } from '@/utils/hotkeys';

export const ThemeModeContext = createContext<
  | {
      isDark: boolean;
      setDark: (isDark: boolean) => void;
    }
  | undefined
>(undefined);

export function useAppThemeMode() {
  // Preserve the host's initial theme across client-side workspace navigation.
  const [fixedTheme] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const theme = params.get('theme');

    if (theme === 'light' || theme === 'dark') return theme;
    return params.get('ars_embed') === '1' ? 'dark' : null;
  });
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (fixedTheme === 'light') {
      return false;
    }

    if (fixedTheme === 'dark') {
      return true;
    }

    // index.html resolves storage/system preferences before the first paint.
    return document.documentElement.getAttribute('data-dark-mode') === 'true';
  });

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (fixedTheme) return;
      switch (true) {
        case createHotkey(HOT_KEY_NAME.TOGGLE_THEME)(e):
          e.preventDefault();
          setIsDark((prev) => !prev);
          break;
        default:
          break;
      }
    },
    [fixedTheme]
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);

  useEffect(() => {
    if (fixedTheme) return;

    function detectColorScheme() {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      setIsDark(darkModeMediaQuery.matches);
    }

    if (localStorage.getItem('dark-mode') === null) {
      detectColorScheme();
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', detectColorScheme);
    return () => {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', detectColorScheme);
    };
  }, [fixedTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-dark-mode', isDark ? 'true' : 'false');
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    document.documentElement.style.removeProperty('background-color');
    // An embedded visit must not overwrite the standalone workspace preference.
    if (!fixedTheme) localStorage.setItem('dark-mode', isDark ? 'true' : 'false');
  }, [isDark, fixedTheme]);

  return {
    isDark,
    setIsDark,
  };
}
