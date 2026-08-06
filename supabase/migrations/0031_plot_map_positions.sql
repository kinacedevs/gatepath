-- Phase 42: Real Site-Plan Plot Map
-- Adds a real, uploaded site-plan image per phase plus per-plot percentage
-- positions on that image, so the interactive plot map can render the real
-- physical layout instead of a generic computed grid, once every plot in a
-- phase has been positioned. Idempotent, additive only.

alter table public.phases add column if not exists site_plan_image_url text;
alter table public.plots add column if not exists map_x numeric;
alter table public.plots add column if not exists map_y numeric;
