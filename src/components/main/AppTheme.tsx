import { createTheme, ThemeProvider } from '@mui/material/styles';
import React, { useMemo } from 'react';
import { I18nextProvider } from 'react-i18next';

import { ThemeModeContext, useAppThemeMode } from '@/components/main/useAppThemeMode';
import { i18nInstance } from '@/i18n/config';

function AppTheme({ children }: { children: React.ReactNode }) {
  const { isDark, setIsDark } = useAppThemeMode();

  const theme = useMemo(
    () =>
      createTheme({
        typography: {
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          button: {
            textTransform: 'none',
          },
        },
        components: {
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderColor: 'var(--border-primary)',
              },
              notchedOutline: {
                borderColor: 'var(--border-primary)',
              },
            },
          },
          MuiMenuItem: {
            defaultProps: {
              sx: {
                '&.Mui-selected.Mui-focusVisible': {
                  backgroundColor: 'var(--fill-content-hover)',
                },
                '&.Mui-focusVisible': {
                  backgroundColor: 'unset',
                },
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                '&:hover, &:focus': {
                  backgroundColor: 'var(--fill-content-hover)',
                },
                borderRadius: '4px',
                padding: '2px',
                '&.MuiIconButton-colorInherit': {
                  color: 'var(--icon-primary)',
                },
                '&.MuiIconButton-colorPrimary': {
                  color: 'var(--text-action)',
                },
              },
              colorSecondary: {
                color: 'var(--billing-primary)',
                '&:hover': {
                  color: 'var(--billing-primary-hover)',
                },
              },
              sizeSmall: {
                '& > *:first-of-type': { fontSize: 20 },
              },
            },
          },

          MuiButton: {
            styleOverrides: {
              text: {
                borderRadius: '4px',
                '&.MuiButton-textPrimary': {
                  color: 'var(--text-action)',
                },
                '&:hover': {
                  backgroundColor: 'var(--fill-content-hover)',
                },
              },
              contained: {
                color: 'var(--text-on-fill)',
                boxShadow: 'none',
                '&.MuiButton-containedPrimary': {
                  color: 'var(--content-on-fill)',
                  '&:hover': {
                    backgroundColor: 'var(--fill-theme-thick-hover)',
                  },
                },

                borderRadius: '4px',
                '&.Mui-disabled': {
                  backgroundColor: 'var(--fill-theme-thick)',
                  opacity: 0.3,
                  color: 'var(--text-on-fill)',
                },
                '&.MuiButton-containedInherit': {
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--surface-primary)',
                  '&:hover': {
                    backgroundColor: 'var(--surface-primary)',
                    boxShadow: 'none',
                  },
                },
                '&.MuiButton-containedSecondary': {
                  backgroundColor: 'var(--billing-primary)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'var(--billing-primary-hover)',
                  },
                },
              },
              outlined: {
                '&.MuiButton-outlinedPrimary': {
                  color: 'var(--text-action)',
                  borderColor: 'var(--border-primary)',
                },
                '&.MuiButton-outlinedInherit': {
                  borderColor: 'var(--border-primary)',
                },
                borderRadius: '4px',
                '&.MuiButton-outlinedSecondary': {
                  color: 'var(--billing-primary)',
                  borderColor: 'var(--billing-primary)',
                  '&:hover': {
                    color: 'var(--billing-primary-hover)',
                    borderColor: 'var(--billing-primary-hover)',
                  },
                },
              },
              sizeSmall: {
                '& .MuiButton-startIcon > *:first-of-type': { fontSize: 20 },
                '& .MuiButton-endIcon > *:first-of-type': { fontSize: 20 },
              },
            },
          },

          MuiButtonBase: {
            styleOverrides: {
              root: {
                '&:not(.MuiButton-contained)': {
                  '&:hover': {
                    backgroundColor: 'var(--fill-content-hover)',
                  },
                  '&:active': {
                    backgroundColor: 'var(--fill-content-hover)',
                  },
                },
                '&.MuiMenuItem-root': {
                  borderRadius: '4px',
                },

                borderRadius: '4px',
                padding: '2px',
                boxShadow: 'none !important',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                boxShadow: 'var(--custom-shadow-sm)',
                borderRadius: '12px',
                backgroundColor: 'var(--background-primary)',
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              root: {
                zIndex: 50,
              },
              paper: {
                borderRadius: 0,
              },

              paperAnchorBottom: {
                borderTopRightRadius: 16,
                borderTopLeftRadius: 16,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              root: {
                zIndex: 50,
              },
              paper: {
                borderRadius: '12px',
                backgroundColor: 'var(--background-primary)',
              },
            },
            defaultProps: {
              sx: {
                '& .MuiBackdrop-root': {
                  backgroundColor: 'var(--surface-overlay)',
                },
              },
            },
          },

          MuiTooltip: {
            styleOverrides: {
              arrow: {
                color: 'var(--fill-toolbar)',
              },
              tooltip: {
                backgroundColor: 'var(--fill-toolbar)',
                color: 'white',
                fontSize: '0.85rem',
                borderRadius: '4px',
                fontWeight: 400,
              },
            },
          },
          MuiPopover: {
            styleOverrides: {
              root: {
                zIndex: 50,
              },
            },
          },
          MuiInputBase: {
            defaultProps: {
              sx: {
                '&.Mui-disabled, .Mui-disabled': {
                  color: 'var(--text-secondary)',
                  WebkitTextFillColor: 'var(--text-secondary) !important',
                },
                borderRadius: '5px',
              },
            },
            styleOverrides: {
              input: {
                backgroundColor: 'transparent !important',
              },
            },
          },
          MuiDivider: {
            styleOverrides: {
              root: {
                borderColor: 'var(--border-primary)',
              },
            },
          },
        },
        palette: {
          mode: isDark ? 'dark' : 'light',
          primary: {
            main: '#E8B23A',
            dark: '#C4952F',
            light: '#F6CF6B',
            contrastText: '#221703',
          },
          secondary: {
            main: '#6D5AE0',
            dark: '#5B46C4',
          },
          error: {
            main: '#A33227',
            dark: '#E59A90',
          },
          warning: {
            main: '#E8B23A',
            dark: '#F6CF6B',
          },
          info: {
            main: '#6D5AE0',
            dark: '#A99BF0',
          },
          success: {
            main: '#2E9E6B',
            dark: '#5CC493',
          },
          text: {
            primary: isDark ? '#EFEDE4' : '#17161B',
            secondary: isDark ? '#C9C8D6' : '#37343C',
            disabled: isDark ? '#8E8FA6' : '#666157',
          },
          divider: isDark ? 'rgba(220, 214, 255, 0.12)' : '#D8CFBC',
          background: {
            default: isDark ? '#0B0C15' : '#F2EDE2',
            paper: isDark ? '#11131F' : '#E9E2D0',
          },
        },
      }),
    [isDark]
  );
  const themeModeValue = useMemo(
    () => ({
      isDark,
      setDark: setIsDark,
    }),
    [isDark, setIsDark]
  );

  return (
    <I18nextProvider i18n={i18nInstance}>
      <ThemeModeContext.Provider value={themeModeValue}>
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </ThemeModeContext.Provider>
    </I18nextProvider>
  );
}

export default AppTheme;
