/**
 * Gatepath Realtors — Amenity/Neighborhood icon allowlist (Phase 40D)
 * A small, curated set of lucide-react icons relevant to real estate —
 * deliberately not third-party favicon-fetching (unreliable, off-brand,
 * a real security surface for no real benefit). Shared by the admin
 * icon picker (admin.plots.tsx) and the public renderer
 * (properties.$slug.tsx) so both always agree on the same icon set.
 */
import {
  School,
  Cross,
  ShoppingCart,
  Church,
  Zap,
  Droplet,
  Milestone,
  ShieldCheck,
  Landmark,
  Plane,
  Waves,
  TreePine,
  Building2,
  Fence,
  Wifi,
  Fuel,
  type LucideIcon,
} from "lucide-react";

export const AMENITY_ICONS: Record<string, LucideIcon> = {
  school: School,
  hospital: Cross,
  shopping: ShoppingCart,
  church: Church,
  electricity: Zap,
  water: Droplet,
  road: Milestone,
  security: ShieldCheck,
  bank: Landmark,
  airport: Plane,
  beach: Waves,
  nature: TreePine,
  town: Building2,
  fence: Fence,
  network: Wifi,
  fuel: Fuel,
};

export const AMENITY_ICON_KEYS = Object.keys(AMENITY_ICONS);

export function getAmenityIcon(key: string | null | undefined): LucideIcon {
  return (key && AMENITY_ICONS[key]) || Milestone;
}
