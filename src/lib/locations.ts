/**
 * Gatepath Realtors — Featured Locations → Phase Slug Map
 * Shared between FeaturedLocations.tsx (public display) and
 * admin.campaigns.tsx's Homepage Content tab (location image editor) — kept
 * in its own file so neither pulls in the other, and so
 * FeaturedLocations.tsx stays a component-only export (react-refresh).
 */
export const locationToSlug: Record<string, string> = {
  Malindi: "malindi-acres-phase-5",
  Sagana: "baraka-plains-phase-6",
  Diani: "diani-plots",
  Nanyuki: "waridi-gardens-phase-1",
  Thika: "juja-plot",
  Matuu: "watali-gardens-phase-1",
  Kithimani: "zuri-court-phase-1",
  Kiambu: "watali-gardens-phase-2",
};
