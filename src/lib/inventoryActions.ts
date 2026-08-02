/**
 * Gatepath Realtors — Property Inventory CRUD (Part 3 "Website Live-Update
 * Map", Slice A)
 *
 * CEO/manager only — creating/archiving inventory and changing pricing is
 * schema-adjacent, revenue-critical, matching the elevated gate already used
 * for Commission rates, Goals, API keys, and Custom Field definitions.
 *
 * Phases and plots are never hard-deleted (is_archived instead) —
 * plot_title_verifications.plot_id is ON DELETE CASCADE, so a real delete
 * would silently wipe legal title-check history, and phases are referenced
 * by slug in public URLs independent of any FK. Plot sizes are never
 * hard-deleted either (is_active instead) — existing plots may already
 * reference a size.
 *
 * Promo fields on plot_sizes are a pure display/marketing layer —
 * paymentActions.ts never reads plot_sizes at all (price resolution is
 * entirely from inquiries.price, set at inquiry-creation time), so these
 * have zero effect on what's actually charged.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";
import { logAuditEvent } from "./auditLog";
import { recomputePhaseCounts } from "./plotActions";

async function verifyManagerCaller(callerAccessToken: string) {
  const anonClient = getAnonClient();
  const { data: callerData, error: callerErr } = await anonClient.auth.getUser(callerAccessToken);
  if (callerErr || !callerData.user?.email) {
    return { ok: false as const, error: "Not authenticated." };
  }

  const serviceClient = getServiceClient();
  const { data: callerRow } = await serviceClient
    .from("admin_users")
    .select("id, full_name, email, role")
    .eq("email", callerData.user.email.toLowerCase())
    .maybeSingle();

  if (!callerRow) {
    return { ok: false as const, error: "Not recognised as Gatepath staff." };
  }
  if (callerRow.role !== "ceo" && callerRow.role !== "manager") {
    return { ok: false as const, error: "Only the CEO or a manager can manage inventory." };
  }

  return { ok: true as const, serviceClient, caller: callerRow };
}

function uniqueViolationMessage(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    return "That plot number or grid position is already in use for this phase.";
  }
  return error.message;
}

// ─── Phases ────────────────────────────────────────────────────────────────

export const createPhaseFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      slug: string;
      name: string;
      phaseNumber?: number;
      location: string;
      region: string;
      county?: string;
      description?: string;
      features?: string[];
    }) => d,
  )
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { data: inserted, error } = await (caller.serviceClient as any)
      .from("phases")
      .insert({
        slug: data.slug.trim(),
        name: data.name.trim(),
        phase_number: data.phaseNumber ?? null,
        location: data.location.trim(),
        region: data.region.trim(),
        county: data.county?.trim() || null,
        status: "coming_soon",
        description: data.description?.trim() || null,
        features: data.features ?? [],
        total_plots: 0,
        available_count: 0,
        booked_count: 0,
        sold_count: 0,
        is_archived: false,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: uniqueViolationMessage(error) };

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: "phase.create",
      entityType: "phases",
      entityId: inserted?.id,
      details: { name: data.name, slug: data.slug },
    });

    return { success: true, phaseId: inserted?.id as string | undefined };
  });

export const updatePhaseDetailsFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      phaseId: string;
      name?: string;
      phaseNumber?: number | null;
      location?: string;
      region?: string;
      county?: string | null;
      status?: "active" | "coming_soon" | "sold_out";
      description?: string | null;
      features?: string[];
    }) => d,
  )
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { phaseId, callerAccessToken: _t, ...rest } = data;
    const payload: Record<string, unknown> = {};
    if (rest.name !== undefined) payload.name = rest.name.trim();
    if (rest.phaseNumber !== undefined) payload.phase_number = rest.phaseNumber;
    if (rest.location !== undefined) payload.location = rest.location.trim();
    if (rest.region !== undefined) payload.region = rest.region.trim();
    if (rest.county !== undefined) payload.county = rest.county?.trim() || null;
    if (rest.status !== undefined) payload.status = rest.status;
    if (rest.description !== undefined) payload.description = rest.description?.trim() || null;
    if (rest.features !== undefined) payload.features = rest.features;

    const { error } = await (caller.serviceClient as any)
      .from("phases")
      .update(payload)
      .eq("id", phaseId);

    if (error) return { success: false, error: error.message };

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: "phase.update",
      entityType: "phases",
      entityId: phaseId,
    });

    return { success: true };
  });

export const setPhaseArchivedFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; phaseId: string; archived: boolean }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await (caller.serviceClient as any)
      .from("phases")
      .update({ is_archived: data.archived })
      .eq("id", data.phaseId);

    if (error) return { success: false, error: error.message };

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: data.archived ? "phase.archive" : "phase.restore",
      entityType: "phases",
      entityId: data.phaseId,
    });

    return { success: true };
  });

// ─── Plots ─────────────────────────────────────────────────────────────────

export const createPlotFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      phaseId: string;
      plotNumber: number;
      rowNum: number;
      colNum: number;
      sizeId?: string;
      notes?: string;
      photoUrls?: string[];
    }) => d,
  )
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { data: inserted, error } = await (caller.serviceClient as any)
      .from("plots")
      .insert({
        phase_id: data.phaseId,
        plot_number: data.plotNumber,
        row_num: data.rowNum,
        col_num: data.colNum,
        size_id: data.sizeId || null,
        notes: data.notes?.trim() || null,
        photo_urls: data.photoUrls && data.photoUrls.length > 0 ? data.photoUrls : null,
        status: "available",
        is_archived: false,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: uniqueViolationMessage(error) };

    await recomputePhaseCounts(caller.serviceClient, data.phaseId);

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: "plot.create",
      entityType: "plots",
      entityId: inserted?.id,
      details: { phaseId: data.phaseId, plotNumber: data.plotNumber },
    });

    return { success: true, plotId: inserted?.id as string | undefined };
  });

export const updatePlotDetailsFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      plotId: string;
      sizeId?: string | null;
      notes?: string | null;
      photoUrls?: string[] | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const payload: Record<string, unknown> = {};
    if (data.sizeId !== undefined) payload.size_id = data.sizeId || null;
    if (data.notes !== undefined) payload.notes = data.notes?.trim() || null;
    if (data.photoUrls !== undefined) {
      payload.photo_urls = data.photoUrls && data.photoUrls.length > 0 ? data.photoUrls : null;
    }

    const { error } = await (caller.serviceClient as any)
      .from("plots")
      .update(payload)
      .eq("id", data.plotId);

    if (error) return { success: false, error: error.message };

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: "plot.update",
      entityType: "plots",
      entityId: data.plotId,
    });

    return { success: true };
  });

export const setPlotArchivedFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; plotId: string; archived: boolean }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { data: plotRow, error } = await (caller.serviceClient as any)
      .from("plots")
      .update({ is_archived: data.archived })
      .eq("id", data.plotId)
      .select("phase_id")
      .single();

    if (error) return { success: false, error: error.message };

    if (plotRow?.phase_id) {
      await recomputePhaseCounts(caller.serviceClient, plotRow.phase_id);
    }

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: data.archived ? "plot.archive" : "plot.restore",
      entityType: "plots",
      entityId: data.plotId,
    });

    return { success: true };
  });

// ─── Plot Sizes / Pricing ───────────────────────────────────────────────────

export const savePlotSizeFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      id?: string;
      phaseId: string;
      label: string;
      sizeDescription?: string;
      areaHa?: number;
      cashPrice: number;
      installmentPrice?: number;
      installmentMonths?: number;
      plotType: "residential" | "commercial" | "agricultural" | "mixed";
      isDefault: boolean;
      promoActive: boolean;
      promoLabel?: string;
      promoPrice?: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const payload = {
      phase_id: data.phaseId,
      label: data.label.trim(),
      size_description: data.sizeDescription?.trim() || null,
      area_ha: data.areaHa ?? null,
      cash_price: data.cashPrice,
      installment_price: data.installmentPrice ?? null,
      installment_months: data.installmentMonths ?? null,
      plot_type: data.plotType,
      is_default: data.isDefault,
      promo_active: data.promoActive,
      promo_label: data.promoActive ? data.promoLabel?.trim() || null : null,
      promo_price: data.promoActive ? (data.promoPrice ?? null) : null,
    };

    const { error } = data.id
      ? await (caller.serviceClient as any).from("plot_sizes").update(payload).eq("id", data.id)
      : await (caller.serviceClient as any).from("plot_sizes").insert(payload);

    if (error) return { success: false, error: error.message };

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: data.id ? "plot_size.update" : "plot_size.create",
      entityType: "plot_sizes",
      entityId: data.id ?? data.label,
    });

    return { success: true };
  });

export const setPlotSizeActiveFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; sizeId: string; active: boolean }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await (caller.serviceClient as any)
      .from("plot_sizes")
      .update({ is_active: data.active })
      .eq("id", data.sizeId);

    if (error) return { success: false, error: error.message };

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: data.active ? "plot_size.activate" : "plot_size.deactivate",
      entityType: "plot_sizes",
      entityId: data.sizeId,
    });

    return { success: true };
  });
