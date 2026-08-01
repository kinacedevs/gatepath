/**
 * Gatepath Realtors — Interaction Timeline (Part 2, Module 1 foundation)
 * Given an inquiryId, shows the logged call/email/WhatsApp/etc. history for
 * that lead and a compact form to log a new one. Reads interaction_log
 * directly (admin-only RLS via public.is_admin(), same as
 * plot_title_verifications elsewhere) — writes go through logInteractionFn's
 * service role, never a direct client insert.
 */
import { useEffect, useState } from "react";
import {
  Phone,
  Mail,
  MessageCircle,
  MessageSquare,
  MapPin,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logInteractionFn } from "@/lib/interactionLogActions";
import { EmptyState } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import type { InteractionLog } from "@/lib/types";

const CHANNEL_ICON: Record<InteractionLog["channel"], typeof Phone> = {
  call: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  sms: MessageSquare,
  site_visit: MapPin,
  other: MoreHorizontal,
};

const CHANNEL_LABEL: Record<InteractionLog["channel"], string> = {
  call: "Call",
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
  site_visit: "Site Visit",
  other: "Other",
};

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function InteractionTimeline({ inquiryId }: { inquiryId: string }) {
  const [entries, setEntries] = useState<InteractionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const [channel, setChannel] = useState<InteractionLog["channel"]>("call");
  const [direction, setDirection] = useState<InteractionLog["direction"]>("outbound");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const loadEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("interaction_log")
      .select("*")
      .eq("inquiry_id", inquiryId)
      .order("occurred_at", { ascending: false });
    if (error) {
      setUnavailable(true);
    } else {
      setEntries((data as InteractionLog[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId]);

  const handleLogInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setSaveMsg("Your session expired — please sign in again.");
      setSaving(false);
      return;
    }

    try {
      const result = await (logInteractionFn as any)({
        data: {
          callerAccessToken: accessToken,
          inquiryId,
          channel,
          direction,
          notes: notes.trim(),
        },
      });
      if (!result.success) {
        setSaveMsg("Error logging interaction: " + result.error);
      } else {
        setNotes("");
        loadEntries();
      }
    } catch (err: any) {
      setSaveMsg("Error logging interaction: " + (err?.message ?? "Unknown error."));
    } finally {
      setSaving(false);
    }
  };

  if (unavailable) {
    return (
      <p className="text-xs text-on-surface-variant italic">
        Activity log unavailable — migration 0008 may not be applied yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleLogInteraction} className="flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <select
            value={channel}
            onChange={(e: any) => setChannel(e.target.value)}
            className="p-2 border border-outline-variant/40 rounded-lg text-[13px] bg-white outline-none"
          >
            {(Object.keys(CHANNEL_LABEL) as InteractionLog["channel"][]).map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABEL[c]}
              </option>
            ))}
          </select>
          <select
            value={direction}
            onChange={(e: any) => setDirection(e.target.value)}
            className="p-2 border border-outline-variant/40 rounded-lg text-[13px] bg-white outline-none"
          >
            <option value="outbound">Outbound (we reached out)</option>
            <option value="inbound">Inbound (they reached us)</option>
          </select>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What happened on this call/message?"
          rows={2}
          className="w-full p-2 border border-outline-variant/40 rounded-lg text-[13px] outline-none resize-y"
        />
        {saveMsg && <p className="text-xs text-error">{saveMsg}</p>}
        <button
          type="submit"
          disabled={saving}
          className="self-start px-4 py-2 bg-primary-container text-white rounded-lg font-semibold text-xs inline-flex items-center gap-1.5"
        >
          {saving && <Loader2 size={13} className="animate-spin" />} Log Interaction
        </button>
      </form>

      <div className="border-t border-outline-variant/30 pt-3">
        {loading ? (
          <Skeleton className="h-16 rounded-lg" />
        ) : entries.length === 0 ? (
          <EmptyState title="No interactions logged yet." />
        ) : (
          <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto">
            {entries.map((entry) => {
              const Icon = CHANNEL_ICON[entry.channel];
              return (
                <div key={entry.id} className="flex items-start gap-2.5 text-[13px]">
                  <div className="w-7 h-7 rounded-full bg-surface-container-low flex items-center justify-center text-primary-container shrink-0 mt-0.5">
                    <Icon size={13} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-primary">
                        {CHANNEL_LABEL[entry.channel]}
                      </span>
                      <span className="text-on-surface-variant">
                        · {entry.direction === "outbound" ? "Outbound" : "Inbound"} ·{" "}
                        {relativeTime(entry.occurred_at)}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-on-surface mt-0.5 break-words">{entry.notes}</p>
                    )}
                    {entry.logged_by_name && (
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Logged by {entry.logged_by_name}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
