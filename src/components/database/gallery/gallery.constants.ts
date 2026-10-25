import { GalleryCardSize } from '@/application/types';

export const GALLERY_INITIAL_ROW_LIMIT = 50;
export const GALLERY_LOAD_MORE_INCREMENT = 30;
export const GALLERY_LOAD_MORE_THRESHOLD = 200;
export const GALLERY_MAX_COLUMNS = 10;
export const GALLERY_GRID_GAP = 1;
export const GALLERY_TILE_PADDING = 8;
export const GALLERY_DESKTOP_INLINE_PADDING = 80;

// Gallery chrome follows the web workspace theme; authored covers keep their colors.
export const GALLERY_CARD_THEME_CLASS_NAME =
  '[--gallery-card-surface:var(--surface-primary)] [--gallery-card-title:var(--text-primary)] [--gallery-card-hint:var(--text-tertiary)]';

// Subtle theme-aware layers over the shared card ground.
export const GALLERY_COVER_PLACEHOLDER_BACKGROUND_CLASS_NAME = 'bg-fill-content-hover';
export const GALLERY_TITLE_SURFACE_BACKGROUND_CLASS_NAME = 'bg-fill-content-hover';

export const GALLERY_CARD_WIDTH: Record<GalleryCardSize, number> = {
  [GalleryCardSize.Small]: 220,
  [GalleryCardSize.Medium]: 300,
  [GalleryCardSize.Large]: 400,
};

export const GALLERY_COVER_HEIGHT: Record<GalleryCardSize, number> = {
  [GalleryCardSize.Small]: 120,
  [GalleryCardSize.Medium]: 150,
  [GalleryCardSize.Large]: 180,
};

export const GALLERY_TITLE_BAR_HEIGHT = 32;

export function getGalleryCardWidth(size: GalleryCardSize): number {
  return GALLERY_CARD_WIDTH[size] ?? GALLERY_CARD_WIDTH[GalleryCardSize.Medium];
}

export function getGalleryCoverHeight(size: GalleryCardSize): number {
  return GALLERY_COVER_HEIGHT[size] ?? GALLERY_COVER_HEIGHT[GalleryCardSize.Medium];
}

export function getGalleryMinimumCardHeight(size: GalleryCardSize): number {
  return getGalleryCoverHeight(size) + GALLERY_TITLE_BAR_HEIGHT;
}
