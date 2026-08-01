/**
 * Gatepath Realtors — Client Directory (VIZ_BLUEPRINT Phase 2, Slice 6)
 * Builds on Phase 5C (real lifetime-value/plots-owned aggregation, working
 * search, real "Pending Title Verifications" panel). Most of VIZ_SPEC.md
 * §4's ambitions (segments, opt-in %, engagement heatmap, interaction
 * timeline) need an interaction-log/consent schema that doesn't exist —
 * skipped, not faked. The one genuinely new real metric: a Diaspora vs
 * Local split from inquiries.client_country (added migration 0005), built
 * as an honest 3-way split including "Not Recorded" for the many historical
 * inquiries that predate the field, rather than silently defaulting nulls
 * to "Local".
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Mail, ShieldAlert, Users, DollarSign, Globe } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatFromKes } from "@/lib/currency";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { QuickCallLogger } from "@/components/admin/QuickCallLogger";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { CategoryBarChart } from "@/components/admin/charts/CategoryBarChart";
import { SplitDonutChart } from "@/components/admin/charts/SplitDonutChart";
import { Skeleton } from "@/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";
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
  /** Most recent inquiry for this client — inquiries are fetched newest-
   * first, so the first row seen per email is already the latest. Calls
   * logged from this screen attach to it, since a client can span several
   * inquiries but interaction_log needs one concrete inquiry_id to anchor to. */
  latestInquiryId: string;
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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
      setLastUpdated(new Date());
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
          latestInquiryId: inq.id,
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

  const totalLifetimeValue = useMemo(
    () => clients.reduce((sum, c) => sum + c.lifetimeValue, 0),
    [clients],
  );

  // Diaspora vs Local — honest 3-way split. client_country is only
  // populated for inquiries submitted after Phase 7B extended the form, so
  // most historical rows are legitimately "Not Recorded", not "Local".
  const diasporaSplit = useMemo(() => {
    let diaspora = 0;
    let local = 0;
    let notRecorded = 0;
    const seen = new Set<string>();
    for (const inq of inquiries) {
      if (seen.has(inq.client_email)) continue;
      seen.add(inq.client_email);
      const country = inq.client_country?.trim();
      if (!country) notRecorded += 1;
      else if (country.toLowerCase() === "kenya") local += 1;
      else diaspora += 1;
    }
    return [
      { name: "Local", value: local },
      { name: "Diaspora", value: diaspora },
      { name: "Not Recorded", value: notRecorded },
    ];
  }, [inquiries]);

  const diasporaCount = diasporaSplit.find((d) => d.name === "Diaspora")?.value ?? 0;

  const topClients = useMemo(
    () =>
      clients
        .slice(0, 6)
        .map((c) => ({ name: c.name, value: c.lifetimeValue }))
        .filter((c) => c.value > 0),
    [clients],
  );

  const columns: ColumnDef<ClientRow, any>[] = [
    {
      id: "client",
      header: "Client Details",
      accessorFn: (row) => row.name,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary-deep font-bold text-sm shrink-0">
            {row.original.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-[14px] text-primary-container">
              {row.original.name}
            </div>
            <div className="text-[12px] text-on-surface-variant">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      id: "phone",
      header: "Phone",
      accessorFn: (row) => row.phone,
      cell: (info) => (
        <span className="text-[14px] text-on-surface">{info.getValue() as string}</span>
      ),
    },
    {
      id: "plotsOwned",
      header: "Plots Owned",
      accessorFn: (row) => row.plotsOwned,
      cell: (info) => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-bold text-xs">
          {info.getValue() as number}
        </span>
      ),
    },
    {
      id: "lifetimeValue",
      header: "Lifetime Value",
      accessorFn: (row) => row.lifetimeValue,
      cell: (info) => (
        <span className="font-semibold text-secondary">
          {formatFromKes(info.getValue() as number, "KES")}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <QuickCallLogger inquiryId={row.original.latestInquiryId} phone={row.original.phone} />
          <a
            href={`mailto:${row.original.email}`}
            className="p-2 bg-surface-container-low rounded-lg text-primary-container hover:bg-primary hover:text-white transition-colors"
          >
            <Mail size={15} />
          </a>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Client Directory
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Centralized directory of all clients who have submitted inquiries or booked plots.
          </p>
        </div>
        <FreshnessStamp updatedAt={lastUpdated} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Contacts"
          value={loading ? "…" : String(clients.length)}
          icon={Users}
        />
        <KpiCard
          label="Total Lifetime Value"
          value={loading ? "…" : formatFromKes(totalLifetimeValue, "KES")}
          icon={DollarSign}
          tone="success"
        />
        <KpiCard
          label="Diaspora Clients"
          value={loading ? "…" : String(diasporaCount)}
          icon={Globe}
        />
        <KpiCard
          label="Pending Verifications"
          value={loading ? "…" : String(pendingApprovals.length)}
          icon={ShieldAlert}
          tone={pendingApprovals.length > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Diaspora vs Local">
          {loading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : (
            <SplitDonutChart data={diasporaSplit} height={200} />
          )}
        </SectionCard>
        <SectionCard title="Top Clients by Lifetime Value">
          {loading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : topClients.length === 0 ? (
            <EmptyState title="No paid clients yet" />
          ) : (
            <CategoryBarChart
              data={topClients}
              xKey="name"
              yKey="value"
              height={200}
              horizontal
              valueFormatter={(v) => formatFromKes(v, "KES")}
            />
          )}
        </SectionCard>
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
        {loading ? (
          <Skeleton className="h-64 rounded-xl m-4" />
        ) : (
          <AdminDataTable
            columns={columns}
            data={clients.slice(0, 25)}
            emptyMessage="No clients found."
          />
        )}
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
