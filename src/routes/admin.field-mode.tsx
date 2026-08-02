/**
 * Gatepath Realtors — Field Mode (Part 2, Module 15: Mobile / Field Mode)
 * Deliberately NOT a scaled-down Kanban — admin.leads.tsx's @dnd-kit board
 * (PointerSensor + a horizontally-scrolling column strip) is a real, working
 * desktop tool, but drag gestures fighting touch-scroll is a well-known bad
 * mobile pattern. This is a single-column card list, always, since the
 * screen's whole reason for existing is thumb-sized targets and zero drag.
 *
 * Status changes call the exact same updateInquiryStatusFn the Kanban's
 * drag handler already calls (src/lib/leadsActions.ts, untouched) — this
 * is just a second, button-based consumer of an already-shipped, already-
 * reviewed server function, not a new write path.
 *
 * Visit logging reuses logInteractionFn (Module 1) with channel:
 * "site_visit", now GPS-capable (Module 15's own migration 0018).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Phone, Mail, MapPin, LocateFixed, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import { updateInquiryStatusFn } from "@/lib/leadsActions";
import { logInteractionFn } from "@/lib/interactionLogActions";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge, INQUIRY_STATUS_TONE } from "@/components/admin/StatusBadge";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Inquiry } from "@/lib/types";

export const Route = createFileRoute("/admin/field-mode")({
  component: FieldMode,
});

const STATUS_BUTTONS: { status: Inquiry["status"]; label: string }[] = [
  { status: "pending", label: "New" },
  { status: "reviewed", label: "In Review" },
  { status: "approved", label: "Won" },
  { status: "rejected", label: "Lost" },
];

function FieldMode() {
  const { adminName, sessionUser } = useAdminSession();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [visitInquiryId, setVisitInquiryId] = useState<string | null>(null);
  const [visitNotes, setVisitNotes] = useState("");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsCapturing, setGpsCapturing] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [savingVisit, setSavingVisit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false });
    setInquiries((data as Inquiry[]) ?? []);
    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadData();
  }, []);

  const myLeads = useMemo(
    () =>
      inquiries.filter((inq) => inq.cro_name === adminName || inq.cro_name === sessionUser.email),
    [inquiries, adminName, sessionUser.email],
  );

  const visibleLeads = showAll ? inquiries : myLeads;

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const changeStatus = async (inquiryId: string, newStatus: Inquiry["status"]) => {
    setUpdatingId(inquiryId);
    setActionMsg(null);
    const token = await getAccessToken();
    if (!token) {
      setActionMsg("Your session expired — please sign in again.");
      setUpdatingId(null);
      return;
    }
    const result = await (updateInquiryStatusFn as any)({
      data: { callerAccessToken: token, inquiryId, newStatus },
    });
    if (!result.success) {
      setActionMsg("Error: " + result.error);
    } else {
      loadData();
    }
    setUpdatingId(null);
  };

  const captureLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("Location isn't supported on this device/browser.");
      return;
    }
    setGpsCapturing(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsCapturing(false);
      },
      (err) => {
        setGpsError(err.message || "Couldn't get your location.");
        setGpsCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const closeVisitDialog = () => {
    setVisitInquiryId(null);
    setVisitNotes("");
    setGpsCoords(null);
    setGpsError(null);
  };

  const submitVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitInquiryId) return;
    setSavingVisit(true);
    const token = await getAccessToken();
    if (!token) {
      setActionMsg("Your session expired — please sign in again.");
      setSavingVisit(false);
      return;
    }
    const result = await (logInteractionFn as any)({
      data: {
        callerAccessToken: token,
        inquiryId: visitInquiryId,
        channel: "site_visit",
        direction: "outbound",
        notes: visitNotes.trim(),
        latitude: gpsCoords?.lat,
        longitude: gpsCoords?.lng,
      },
    });
    if (!result.success) {
      setActionMsg("Error logging visit: " + result.error);
    } else {
      setActionMsg("Visit logged.");
      closeVisitDialog();
    }
    setSavingVisit(false);
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">Field Mode</h1>
          <p className="text-body-md text-on-surface-variant">
            Quick lead actions and GPS-tagged visit logging, built for a phone in the field.
          </p>
        </div>
        <FreshnessStamp updatedAt={lastUpdated} />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold border ${!showAll ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant"}`}
        >
          My Leads ({myLeads.length})
        </button>
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold border ${showAll ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant"}`}
        >
          All Leads ({inquiries.length})
        </button>
      </div>

      {actionMsg && (
        <div className="px-4 py-2.5 bg-info-container/10 border border-info-container/30 rounded-lg text-[13px] text-on-surface">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : visibleLeads.length === 0 ? (
        <EmptyState
          title="No leads to show."
          description={!showAll ? "No inquiries are assigned to you yet." : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {visibleLeads.map((inq) => (
            <div key={inq.id} className="luxury-card rounded-xl bg-white p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-[15px] text-primary-container truncate">
                    {inq.client_full_name}
                  </div>
                  <div className="text-[12px] text-on-surface-variant truncate">
                    {inq.phase_name ?? "—"}
                    {inq.plot_number_ref ? ` · Plot #${inq.plot_number_ref}` : ""}
                  </div>
                </div>
                <StatusBadge tone={INQUIRY_STATUS_TONE[inq.status]}>{inq.status}</StatusBadge>
              </div>

              <div className="flex items-center gap-3 text-[12px] text-on-surface-variant">
                <a href={`tel:${inq.client_phone}`} className="flex items-center gap-1">
                  <Phone size={12} /> {inq.client_phone}
                </a>
                <a href={`mailto:${inq.client_email}`} className="flex items-center gap-1 truncate">
                  <Mail size={12} /> {inq.client_email}
                </a>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {STATUS_BUTTONS.map((s) => (
                  <button
                    key={s.status}
                    type="button"
                    disabled={updatingId === inq.id || inq.status === s.status}
                    onClick={() => changeStatus(inq.id, s.status)}
                    className={`px-2 py-2 rounded-lg text-[11px] font-semibold border disabled:opacity-40 ${
                      inq.status === s.status
                        ? "bg-primary text-white border-primary"
                        : "border-outline-variant/40 text-on-surface-variant"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setVisitInquiryId(inq.id)}
                className="w-full px-3 py-2.5 rounded-lg bg-accent text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <MapPin size={14} /> Log Visit
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ══════ MODAL: LOG VISIT (with GPS) ══════ */}
      <Dialog open={!!visitInquiryId} onOpenChange={(open) => !open && closeVisitDialog()}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Log Site Visit</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitVisit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={captureLocation}
                disabled={gpsCapturing}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-outline-variant/40 rounded-lg text-[12px] font-semibold text-primary-container disabled:opacity-50"
              >
                {gpsCapturing ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <LocateFixed size={13} />
                )}
                {gpsCoords ? "Location Captured" : "Capture My Location"}
              </button>
              {gpsError && <span className="text-[11px] text-error">{gpsError}</span>}
            </div>
            <textarea
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value)}
              placeholder="Notes about this visit (optional)"
              rows={3}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none resize-y"
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={closeVisitDialog}
                className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingVisit}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold inline-flex items-center gap-1.5"
              >
                {savingVisit && <Loader2 size={13} className="animate-spin" />} Log Visit
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
