/**
 * Gatepath Realtors — Default homepage hero images.
 * Shared between Hero.tsx (renders them) and index.tsx's route head
 * (preloads the first one) — kept in its own file rather than exported
 * from Hero.tsx so editing the component doesn't break React Fast Refresh
 * (a file that exports both a component and a plain constant loses
 * hot-reload reliability).
 */
export const DEFAULT_HERO_IMAGES = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=80",
];
