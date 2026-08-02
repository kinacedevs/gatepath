/**
 * Gatepath Realtors — Data Export (Settings Expansion)
 *
 * "Backup" at the infrastructure level is already handled by Supabase's own
 * managed platform — not rebuilt here. This is a portability/reporting
 * feature: CSV export of core tables, CEO/manager only (bulk PII/financial
 * export is more sensitive than editing a label, matching Data Governance's
 * elevated-sensitivity precedent). Same safe-column-allowlist discipline as
 * the /api/v1 reads — full KYC fields (ID/passport, KRA PIN, next-of-kin)
 * are excluded from the inquiries export too.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const escape = (value: unknown) => {
    const s = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.join(",");
  const body = rows.map((row) => columns.map((c) => escape(row[c])).join(",")).join("\n");
  return `${header}\n${body}`;
}

const TABLE_COLUMNS: Record<"inquiries" | "payments" | "plots", string> = {
  inquiries:
    "id, client_full_name, client_email, client_phone, phase_name, plot_number_ref, price, status, heard_from, created_at",
  payments: "id, inquiry_id, plot_id, amount, currency, status, payment_method, created_at",
  plots: "id, phase_id, plot_number, status, created_at, updated_at",
};

export const exportTableCsvFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; table: "inquiries" | "payments" | "plots" }) => d)
  .handler(async ({ data }) => {
    const anonClient = getAnonClient();
    const { data: callerData, error: callerErr } = await anonClient.auth.getUser(
      data.callerAccessToken,
    );
    if (callerErr || !callerData.user?.email) {
      return { success: false as const, error: "Not authenticated." };
    }

    const serviceClient = getServiceClient();
    const { data: callerRow } = await serviceClient
      .from("admin_users")
      .select("id, role")
      .eq("email", callerData.user.email.toLowerCase())
      .maybeSingle();
    if (!callerRow) {
      return { success: false as const, error: "Not recognised as Gatepath staff." };
    }
    if (callerRow.role !== "ceo" && callerRow.role !== "manager") {
      return { success: false as const, error: "Only the CEO or a manager can export data." };
    }

    const columnsStr = TABLE_COLUMNS[data.table];
    if (!columnsStr) return { success: false as const, error: "Unknown table." };

    const { data: rows, error } = await (serviceClient as any)
      .from(data.table)
      .select(columnsStr)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) return { success: false as const, error: error.message };

    const columns = columnsStr.split(",").map((c) => c.trim());
    const csv = toCsv((rows as Record<string, unknown>[]) ?? [], columns);

    return { success: true as const, csv, filename: `gatepath_${data.table}_export.csv` };
  });
