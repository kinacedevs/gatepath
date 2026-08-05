/**
 * Gatepath Realtors — Quick Call Logger (Part 2, Module 11)
 * Pairs a real tel: click-to-call link (same markup already used at every
 * tel: site in this codebase — opens the device's native dialer, unchanged)
 * with a one-click "Log Call" action, so clicking to call and recording the
 * outcome become one flow instead of a dead, unlogged link. Direction is
 * hardcoded to "outbound" — staff always initiate from these admin views.
 * Reuses logInteractionFn (Module 1) — no new server function.
 */
import { useState } from "react";
import { Phone, PhoneCall, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logInteractionFn } from "@/lib/interactionLogActions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { InteractionLog } from "@/lib/types";

type CallOutcome = NonNullable<InteractionLog["call_outcome"]>;

const OUTCOME_LABEL: Record<CallOutcome, string> = {
  connected: "Connected",
  voicemail: "Voicemail",
  no_answer: "No Answer",
  wrong_number: "Wrong Number",
  callback_requested: "Callback Requested",
};

export function QuickCallLogger({
  inquiryId,
  phone,
  className,
}: {
  inquiryId: string;
  phone: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<CallOutcome>("connected");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setSaveMsg("Your session expired — please sign in again.");
        return;
      }

      const result = await (logInteractionFn as any)({
        data: {
          callerAccessToken: accessToken,
          inquiryId,
          channel: "call",
          direction: "outbound",
          notes: notes.trim(),
          callOutcome: outcome,
        },
      });
      if (!result.success) {
        setSaveMsg("Error logging call: " + result.error);
      } else {
        setNotes("");
        setOutcome("connected");
        setOpen(false);
      }
    } catch (err: any) {
      setSaveMsg("Error logging call: " + (err?.message ?? "Unknown error."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={cn("flex items-center gap-1", className)}>
        <a
          href={`tel:${phone}`}
          className="p-2 bg-surface-container-low rounded-lg text-primary-container hover:bg-primary hover:text-white transition-colors"
          title={`Call ${phone}`}
        >
          <PhoneCall size={15} />
        </a>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 bg-surface-container-low rounded-lg text-on-surface-variant hover:bg-primary hover:text-white transition-colors"
          title="Log call outcome"
        >
          <Phone size={13} />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Log Call — {phone}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as CallOutcome)}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
            >
              {(Object.keys(OUTCOME_LABEL) as CallOutcome[]).map((o) => (
                <option key={o} value={o}>
                  {OUTCOME_LABEL[o]}
                </option>
              ))}
            </select>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none resize-y"
            />
            {saveMsg && <p className="text-xs text-error">{saveMsg}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold inline-flex items-center gap-1.5"
              >
                {saving && <Loader2 size={13} className="animate-spin" />} Log Call
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
