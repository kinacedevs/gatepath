/**
 * Gatepath Realtors — Client Directory (Phase 5C redesign)
 * Replaces the Phase 5A mechanical split of the old "contacts" tab. Real
 * additions: lifetime value (real sum of successful payments per client),
 * plots owned (count of that client's approved inquiries), and a "Pending
 * Approvals" panel wired to the plot_title_verifications table added in
 * Phase 5B — booked/sold plots with no verification check logged yet. The
 * search bar is now real (the original had no onChange handler at all).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, PhoneCall, Mail, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatFromKes } from "@/lib/currency";
import type { Inquiry, Plot } from "@/lib/types";

export const Route = createFileRoute("/admin/contacts")({
  component: ClientDirectory,
});

interface ClientRow {
  email: string;
  name: string;
  phone: string;
  idPassport: string;
  kraPin: string | null;
  lifetimeValue: number;
  plotsOwned: number;
}

interface PendingApproval {
  plotId: string;
  plotNumber: number;
  phaseId: string;
}

function ClientDirectory() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [paidByInquiry, setPaidByInquiry] = useState<Map<string, number>>(new Map());
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);

      const [inquiriesRes, paymentsRes, plotsRes] = await Promise.all([
        supabase.from("inquiries").select("*").order("created_at", { ascending: false }),
        supabase.from("payments").select("inquiry_id, amount").eq("status", "success"),
        supabase.from("plots").select("*").in("status", ["booked", "sold"]),
      ]);

      setInquiries((inquiriesRes.data as Inquiry[]) ?? []);

      const paid = new Map<string, number>();
      for (const p of (paymentsRes.data ?? []) as { inquiry_id: string | null; amount: number }[]) {
        if (!p.inquiry_id) continue;
        paid.set(p.inquiry_id, (paid.get(p.inquiry_id) ?? 0) + Number(p.amount));
      }
      setPaidByInquiry(paid);

      // Pending Approvals: booked/sold plots with no logged title check yet.
      // Fails gracefully if migration 0004 hasn't been applied.
      const { data: verificationRows, error: verificationErr } = await supabase
        .from("plot_title_verifications")
        .select("plot_id");
      if (verificationErr) {
        setPendingError("Verification data unavailable — migration 0004 may not be applied yet.");
      } else {
        const verifiedPlotIds = new Set(
          ((verificationRows ?? []) as { plot_id: string }[]).map((v) => v.plot_id),
        );
        const unverified = ((plotsRes.data as Plot[]) ?? [])
          .filter((p) => !verifiedPlotIds.has(p.id))
          .slice(0, 5)
          .map((p) => ({ plotId: p.id, plotNumber: p.plot_number, phaseId: p.phase_id }));
        setPendingApprovals(unverified);
      }

      setLoading(false);
    })();
  }, []);

  const clients = useMemo(() => {
    const byEmail = new Map<string, ClientRow>();
    for (const inq of inquiries) {
      const existing = byEmail.get(inq.client_email);
      const paid = paidByInquiry.get(inq.id) ?? 0;
      const ownsThis = inq.status === "approved" ? 1 : 0;
      if (existing) {
        existing.lifetimeValue += paid;
        existing.plotsOwned += ownsThis;
      } else {
        byEmail.set(inq.client_email, {
          email: inq.client_email,
          name: inq.client_full_name,
          phone: inq.client_phone,
          idPassport: inq.client_id_passport,
          kraPin: inq.client_kra_pin,
          lifetimeValue: paid,
          plotsOwned: ownsThis,
        });
      }
    }
    return Array.from(byEmail.values())
      .filter(
        (c) =>
          search === "" ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()) ||
          c.phone.includes(search),
      )
      .sort((a, b) => b.lifetimeValue - a.lifetimeValue);
  }, [inquiries, paidByInquiry, search]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
          Client Directory
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Centralized directory of all clients who have submitted inquiries or booked plots.
        </p>
      </div>

      <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
        <div className="p-4 border-b border-outline-variant/30">
          <div className="relative max-w-75">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone or email..."
              className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-outline-variant/40 text-[13px] outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-outline-variant/30">
              <tr>
                <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">
                  Client Details
                </th>
                <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">
                  Phone
                </th>
                <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">
                  Plots Owned
                </th>
                <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">
                  Lifetime Value
                </th>
                <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px] text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {clients.slice(0, 25).map((c) => (
                <tr key={c.email} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary-deep font-bold text-sm shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-[14px] text-primary-container">
                          {c.name}
                        </div>
                        <div className="text-[12px] text-on-surface-variant">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[14px] text-on-surface">{c.phone}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-bold text-xs">
                      {c.plotsOwned}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-secondary">
                    {formatFromKes(c.lifetimeValue, "KES")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <a
                        href={`tel:${c.phone}`}
                        className="p-2 bg-surface-container-low rounded-lg text-primary-container hover:bg-primary hover:text-white transition-colors"
                      >
                        <PhoneCall size={15} />
                      </a>
                      <a
                        href={`mailto:${c.email}`}
                        className="p-2 bg-surface-container-low rounded-lg text-primary-container hover:bg-primary hover:text-white transition-colors"
                      >
                        <Mail size={15} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-on-surface-variant">
                    No clients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="luxury-card rounded-xl p-6 bg-white space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-on-warning-container" />
          <h3 className="font-headline-md text-sm text-primary font-bold">
            Pending Title Verifications
          </h3>
        </div>
        <p className="text-xs text-on-surface-variant">
          Booked or sold plots with no title-verification check logged yet.
        </p>
        {pendingError ? (
          <p className="text-xs text-on-surface-variant italic">{pendingError}</p>
        ) : pendingApprovals.length === 0 ? (
          <p className="text-xs text-on-surface-variant italic">
            {loading ? "Loading…" : "Nothing pending — every booked/sold plot has a check logged."}
          </p>
        ) : (
          <div className="space-y-2">
            {pendingApprovals.map((p) => (
              <div
                key={p.plotId}
                className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg"
              >
                <span className="text-[13px] font-medium text-primary-container">
                  Plot #{p.plotNumber}
                </span>
                <Link
                  to="/admin/plots/$plotId"
                  params={{ plotId: p.plotId }}
                  className="text-[11px] font-bold text-secondary hover:underline"
                >
                  Review &amp; Log Check
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
