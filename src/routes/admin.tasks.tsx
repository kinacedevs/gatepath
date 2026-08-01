/**
 * Gatepath Realtors — Tasks & Follow-ups (Part 2, Module 2)
 * "Every follow-up is a dated task with reminders and SLA" — SLA is made
 * concrete as due_at + status (overdue = past due, still pending), not a
 * separate config. Calendar + agenda reuses the exact shape admin.bookings.tsx
 * (Phase 8 Slice 1) already built: ui/calendar.tsx dot markers + a
 * SectionCard agenda panel + per-item actions + a reschedule Dialog. A small
 * same-day site-visit cross-reference badge reads bookings.visit_date,
 * matching the Leads Kanban's existing "Site visit booked" cross-reference
 * precedent, rather than merging two data models into one.
 *
 * Due-payments are deliberately NOT plotted on this calendar — no real
 * due-date schedule exists (docs/VIZ_SPEC.md §6), only past actual payments
 * and a monthly-heuristic approximation with no specific day to place a
 * marker on. Flagged, not fabricated.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  ListTodo,
  Send,
  Loader2,
  MapPin,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createTaskFn, updateTaskFn, sendTaskReminderFn } from "@/lib/taskActions";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { AdminUser, Task } from "@/lib/types";

export const Route = createFileRoute("/admin/tasks")({
  component: TasksAndFollowUps,
});

const PRIORITY_TONE = {
  low: "neutral",
  medium: "info",
  high: "warning",
} as const;

/** Local (not UTC) YYYY-MM-DD — matches admin.bookings.tsx's helper so the
 * same date never rolls back a day under EAT (UTC+3). */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** <input type="datetime-local"> value from an ISO string, in local time. */
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TasksAndFollowUps() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [bookingDates, setBookingDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [actionState, setActionState] = useState<Record<string, boolean>>({});

  const [creatingTask, setCreatingTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueAt, setNewDueAt] = useState("");
  const [newAssignedEmail, setNewAssignedEmail] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");
  const [createSaving, setCreateSaving] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const [reschedulingTask, setReschedulingTask] = useState<Task | null>(null);
  const [rescheduleDueAt, setRescheduleDueAt] = useState("");

  const loadData = async () => {
    setLoading(true);
    const [tasksRes, staffRes, bookingsRes] = await Promise.all([
      supabase.from("tasks").select("*").order("due_at", { ascending: true }),
      supabase.from("admin_users").select("*").order("full_name"),
      supabase.from("bookings").select("visit_date"),
    ]);
    if (tasksRes.error) {
      setUnavailable(true);
    } else {
      setTasks((tasksRes.data as Task[]) ?? []);
    }
    setStaff((staffRes.data as AdminUser[]) ?? []);
    const bookingRows = (bookingsRes.data ?? []) as { visit_date: string | null }[];
    setBookingDates(new Set(bookingRows.map((b) => b.visit_date).filter(Boolean) as string[]));
    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayKey = localDateKey(new Date());
  const now = new Date();

  const openTasks = tasks.filter((t) => t.status === "pending").length;
  const overdue = tasks.filter(
    (t) => t.status === "pending" && t.due_at && new Date(t.due_at) < now,
  ).length;
  const dueToday = tasks.filter(
    (t) => t.status === "pending" && t.due_at && localDateKey(new Date(t.due_at)) === todayKey,
  ).length;
  const completedThisWeek = tasks.filter((t) => {
    if (t.status !== "completed" || !t.completed_at) return false;
    const days = (now.getTime() - new Date(t.completed_at).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  }).length;

  const dueDateObjs = useMemo(() => {
    const keys = new Set<string>();
    tasks.forEach((t) => {
      if (t.due_at) keys.add(localDateKey(new Date(t.due_at)));
    });
    return Array.from(keys).map((d) => new Date(`${d}T00:00:00`));
  }, [tasks]);

  const selectedDateKey = localDateKey(selectedDate);
  const dayTasks = tasks.filter(
    (t) => t.due_at && localDateKey(new Date(t.due_at)) === selectedDateKey,
  );
  const hasSiteVisitSameDay = bookingDates.has(selectedDateKey);

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token;
  };

  const runAction = async (taskId: string, patch: { status?: Task["status"]; dueAt?: string }) => {
    setActionState((s) => ({ ...s, [taskId]: true }));
    const accessToken = await getAccessToken();
    if (accessToken) {
      await updateTaskFn({ data: { ...patch, callerAccessToken: accessToken, taskId } });
      await loadData();
    }
    setActionState((s) => ({ ...s, [taskId]: false }));
  };

  const sendReminder = async (taskId: string) => {
    setActionState((s) => ({ ...s, [taskId]: true }));
    const accessToken = await getAccessToken();
    if (accessToken) {
      await sendTaskReminderFn({ data: { callerAccessToken: accessToken, taskId } });
    }
    setActionState((s) => ({ ...s, [taskId]: false }));
  };

  const openReschedule = (task: Task) => {
    setReschedulingTask(task);
    setRescheduleDueAt(toDatetimeLocalValue(task.due_at));
  };

  const submitReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingTask || !rescheduleDueAt) return;
    await runAction(reschedulingTask.id, { dueAt: new Date(rescheduleDueAt).toISOString() });
    setReschedulingTask(null);
  };

  const openCreateTask = () => {
    setNewTitle("");
    setNewDescription("");
    setNewDueAt("");
    setNewAssignedEmail("");
    setNewPriority("medium");
    setCreateMsg(null);
    setCreatingTask(true);
  };

  const submitCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSaving(true);
    setCreateMsg(null);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setCreateMsg("Your session expired — please sign in again.");
      setCreateSaving(false);
      return;
    }
    const assignedStaff = staff.find((s) => s.email === newAssignedEmail);
    const result = await createTaskFn({
      data: {
        callerAccessToken: accessToken,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        dueAt: newDueAt ? new Date(newDueAt).toISOString() : undefined,
        assignedToEmail: assignedStaff?.email,
        assignedToName: assignedStaff?.full_name ?? undefined,
        priority: newPriority,
      },
    });
    if (!result.success) {
      setCreateMsg("Error creating task: " + result.error);
    } else {
      setCreatingTask(false);
      loadData();
    }
    setCreateSaving(false);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Tasks &amp; Follow-ups
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Dated follow-ups with reminders — every step tracked, not left to memory.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FreshnessStamp updatedAt={lastUpdated} />
          <button
            onClick={openCreateTask}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-accent rounded-lg text-white font-bold text-[13px]"
          >
            <Plus size={14} /> New Task
          </button>
        </div>
      </div>

      {unavailable ? (
        <SectionCard>
          <p className="text-sm text-on-surface-variant italic">
            Tasks unavailable — migration 0009 may not be applied yet.
          </p>
        </SectionCard>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Open Tasks" value={loading ? "…" : String(openTasks)} icon={ListTodo} />
            <KpiCard
              label="Overdue"
              value={loading ? "…" : String(overdue)}
              icon={AlertTriangle}
              tone={overdue > 0 ? "warning" : "default"}
            />
            <KpiCard label="Due Today" value={loading ? "…" : String(dueToday)} icon={Clock} />
            <KpiCard
              label="Completed This Week"
              value={loading ? "…" : String(completedThisWeek)}
              icon={CheckCircle}
              tone="success"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-start">
            <SectionCard title="Calendar" className="w-fit">
              {loading ? (
                <Skeleton className="h-70 w-70 rounded-xl" />
              ) : (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  modifiers={{ hasTask: dueDateObjs }}
                  modifiersClassNames={{
                    hasTask:
                      "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-accent",
                  }}
                />
              )}
            </SectionCard>

            <SectionCard
              title={selectedDate.toLocaleDateString("en-KE", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            >
              {hasSiteVisitSameDay && (
                <div className="flex items-center gap-1.5 text-[12px] text-on-info-container bg-info-container/10 rounded-lg px-3 py-2 mb-3">
                  <MapPin size={13} /> Also a scheduled site visit this day — see Site Visits.
                </div>
              )}
              {loading ? (
                <Skeleton className="h-32 rounded-xl" />
              ) : dayTasks.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-8">
                  No tasks due this day.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {dayTasks.map((task) => {
                    const busy = actionState[task.id];
                    const isOverdue =
                      task.status === "pending" && task.due_at && new Date(task.due_at) < now;
                    return (
                      <div
                        key={task.id}
                        className="rounded-xl border border-outline-variant/30 p-4 bg-surface-container-lowest"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-primary-container truncate">
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                {task.description}
                              </p>
                            )}
                            <p className="text-[11px] text-on-surface-variant mt-1">
                              Assigned to {task.assigned_to_name || "Unassigned"}
                              {task.due_at &&
                                ` · Due ${new Date(task.due_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <StatusBadge tone={PRIORITY_TONE[task.priority]}>
                              {task.priority}
                            </StatusBadge>
                            {isOverdue && <StatusBadge tone="error">overdue</StatusBadge>}
                            {task.status !== "pending" && (
                              <StatusBadge
                                tone={task.status === "completed" ? "success" : "neutral"}
                              >
                                {task.status}
                              </StatusBadge>
                            )}
                          </div>
                        </div>
                        {task.status === "pending" && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            <button
                              disabled={busy}
                              onClick={() => runAction(task.id, { status: "completed" })}
                              className="px-2.5 py-1.5 rounded-lg bg-success-container/15 text-on-success-container text-[11px] font-bold disabled:opacity-50"
                            >
                              Complete
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => openReschedule(task)}
                              className="px-2.5 py-1.5 rounded-lg bg-surface-container-high text-on-surface text-[11px] font-bold disabled:opacity-50"
                            >
                              Reschedule
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => runAction(task.id, { status: "cancelled" })}
                              className="px-2.5 py-1.5 rounded-lg bg-error/10 text-error text-[11px] font-bold disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            {task.assigned_to_email && (
                              <button
                                disabled={busy}
                                onClick={() => sendReminder(task.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-info-container/15 text-on-info-container text-[11px] font-bold disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                {busy ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <Send size={11} />
                                )}{" "}
                                Send Reminder
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          {!loading && tasks.length === 0 && (
            <EmptyState icon={ListTodo} title="No tasks yet — create your first follow-up." />
          )}
        </>
      )}

      {/* ══════ MODAL: NEW TASK ══════ */}
      <Dialog open={creatingTask} onOpenChange={(open) => !open && setCreatingTask(false)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCreateTask} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Call John Kariuki re: balance payment"
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                Description
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none resize-y"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                Due
              </label>
              <input
                type="datetime-local"
                value={newDueAt}
                onChange={(e) => setNewDueAt(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                  Assign To
                </label>
                <select
                  value={newAssignedEmail}
                  onChange={(e) => setNewAssignedEmail(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.email}>
                      {s.full_name || s.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                  Priority
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as Task["priority"])}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            {createMsg && <p className="text-xs text-error">{createMsg}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setCreatingTask(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createSaving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
              >
                {createSaving ? "Creating…" : "Create Task"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════ MODAL: RESCHEDULE ══════ */}
      <Dialog open={!!reschedulingTask} onOpenChange={(open) => !open && setReschedulingTask(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Reschedule Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitReschedule} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                New Due Date &amp; Time
              </label>
              <input
                type="datetime-local"
                required
                value={rescheduleDueAt}
                onChange={(e) => setRescheduleDueAt(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setReschedulingTask(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
              >
                Confirm New Due Date
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
