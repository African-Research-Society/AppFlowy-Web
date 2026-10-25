import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import GallerySettings from '@/components/database/components/settings/GallerySettings';
import { Button } from '@/components/ui/button';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'settings.title' ? 'Settings' : key),
  }),
}));

jest.mock('@/components/database/components/settings/Properties', () => ({
  __esModule: true,
  default: () => <div>properties</div>,
}));

jest.mock('@/components/database/components/settings/Layout', () => ({
  __esModule: true,
  default: () => <div>layout</div>,
}));

jest.mock('@/components/database/components/settings/GalleryLayoutSettings', () => ({
  __esModule: true,
  default: () => <div>gallery</div>,
  GALLERY_POPOVER_SHELL_CLASS_NAME:
    'rounded-[12px] border-0 bg-surface-primary ring-1 ring-[var(--border-primary)] shadow-[var(--custom-shadow-sm)]',
}));

describe('GallerySettings', () => {
  it('uses the real button as the Radix trigger without ref warnings and restores focus', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      render(
        <GallerySettings>
          <Button data-testid='settings-trigger' type='button' variant='ghost'>
            Open
          </Button>
        </GallerySettings>
      );

      const trigger = screen.getByTestId('settings-trigger');

      expect(trigger.tagName).toBe('BUTTON');
      expect(trigger.getAttribute('aria-label')).toBe('Settings');
      expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger.closest('.h-7.w-7')).toBeNull();

      act(() => trigger.focus());
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });

      await waitFor(() => expect(screen.getByText('properties')).toBeTruthy());

      const menu = screen.getByRole('menu');

      expect(menu.className).toContain('w-[240px]');
      expect(menu.className).toContain('!min-w-[240px]');
      expect(menu.className).toContain('p-1.5');
      expect(menu.className).toContain('rounded-[12px]');
      expect(menu.className).toContain('border-0');
      expect(menu.className).toContain('bg-surface-primary');
      expect(menu.className).toContain('ring-1');
      expect(menu.className).toContain('ring-[var(--border-primary)]');
      expect(menu.className).toContain('shadow-[var(--custom-shadow-sm)]');
      fireEvent.keyDown(menu, { key: 'Escape' });

      await waitFor(() => expect(document.activeElement).toBe(trigger));
      expect(
        consoleError.mock.calls.filter(([message]) =>
          String(message).includes('Function components cannot be given refs')
        )
      ).toHaveLength(0);
    } finally {
      consoleError.mockRestore();
    }
  });
});
