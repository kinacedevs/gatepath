/**
 * Gatepath Realtors — Task Actions (Server Functions)
 *
 * Same pattern as bookingActions.ts/interactionLogActions.ts: service-role
 * client, caller re-verified server-side via callerAccessToken, never
 * trusting a client-asserted role. Any recognised staff member can act —
 * task management is routine day-to-day work, not CEO-gated.
 *
 * sendTaskReminderFn reuses the existing sendResendEmail function
 * (src/lib/notifications.ts) to notify the ASSIGNED STAFF MEMBER (not the
 * client — this is an internal follow-up reminder), giving "reminders" real
 * substance without needing a cron/automation layer. Email-only — admin_users
 * has no phone column today, so SMS isn't possible yet. Manual trigger only
 * — automated background reminders need Cloudflare Cron Triggers or the
 * future Automation/n8n module, out of scope here.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";
import { sendResendEmail } from "./notifications";
import { logAuditEvent } from "./auditLog";
import { getTemplateOrDefault, renderTemplate } from "./messageTemplateActions";

async function verifyStaffCaller(callerAccessToken: string) {
  const anonClient = getAnonClient();
  const { data: callerData, error: callerErr } = await anonClient.auth.getUser(callerAccessToken);
  if (callerErr || !callerData.user?.email) {
    return { ok: false as const, error: "Not authenticated." };
  }

  const serviceClient = getServiceClient();
  const { data: callerRow } = await serviceClient
    .from("admin_users")
    .select("id, full_name, email")
    .eq("email", callerData.user.email.toLowerCase())
    .maybeSingle();

  if (!callerRow) {
    return { ok: false as const, error: "Not recognised as Gatepath staff." };
  }

  return { ok: true as const, serviceClient, caller: callerRow };
}

export const createTaskFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      title: string;
      description?: string;
      dueAt?: string;
      assignedToEmail?: string;
      assignedToName?: string;
      relatedInquiryId?: string;
      priority?: "low" | "medium" | "high";
    }) => d,
  )
  .handler(async ({ data }) => {
    const caller = await verifyStaffCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await caller.serviceClient.from("tasks").insert({
      title: data.title,
      description: data.description || null,
      due_at: data.dueAt || null,
      assigned_to_email: data.assignedToEmail || null,
      assigned_to_name: data.assignedToName || null,
      related_inquiry_id: data.relatedInquiryId || null,
      priority: data.priority ?? "medium",
      created_by_email: caller.caller.email,
      created_by_name: caller.caller.full_name,
    });

    if (error) return { success: false, error: error.message };

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: "task.create",
      entityType: "tasks",
      details: { title: data.title },
    });

    return { success: true };
  });

export const updateTaskFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      taskId: string;
      status?: "pending" | "completed" | "cancelled";
      dueAt?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const caller = await verifyStaffCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const patch: Record<string, unknown> = {};
    if (data.status) {
      patch.status = data.status;
      patch.completed_at = data.status === "completed" ? new Date().toISOString() : null;
    }
    if (data.dueAt) patch.due_at = data.dueAt;

    if (Object.keys(patch).length === 0) {
      return { success: false, error: "Nothing to update." };
    }

    const { error } = await caller.serviceClient.from("tasks").update(patch).eq("id", data.taskId);
    if (error) return { success: false, error: error.message };

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: "task.update",
      entityType: "tasks",
      entityId: data.taskId,
      details: patch,
    });

    return { success: true };
  });

export const sendTaskReminderFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; taskId: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyStaffCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { data: task } = await caller.serviceClient
      .from("tasks")
      .select("*")
      .eq("id", data.taskId)
      .maybeSingle();

    if (!task) return { success: false, error: "Task not found." };
    if (!task.assigned_to_email) {
      return { success: false, error: "This task has no assigned staff member to remind." };
    }

    const dueText = task.due_at
      ? new Date(task.due_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })
      : "no due date set";

    const defaultSubject = `Task Reminder: ${task.title}`;
    const defaultBody = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><title>Task Reminder</title></head>
<body style="margin: 0; padding: 0; background-color: #F8F4EE; font-family: Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="padding: 40px 0 30px 0;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; border: 1px solid #E5E0D8; background-color: #FFFFFF; border-radius: 12px; overflow: hidden;">
        <tr><td align="center" bgcolor="#074B7D" style="padding: 40px 0 30px 0; color: #FFFFFF; font-size: 24px; font-weight: bold;">GATEPATH REALTORS</td></tr>
        <tr><td style="padding: 40px 30px 40px 30px;">
          <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">Hello <strong>${task.assigned_to_name ?? "there"}</strong>,</p>
          <p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 22px; color: #666666; margin-bottom: 20px;">
            This is a reminder about a task assigned to you: <strong>${task.title}</strong>.
          </p>
          <table border="0" cellpadding="12" cellspacing="0" width="100%" style="background-color: #F8F4EE; border: 1px solid #E5E0D8; border-radius: 8px;">
            <tr><td style="font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
              <strong>Due:</strong> ${dueText}<br/>
              ${task.description ? `<strong>Details:</strong> ${task.description}` : ""}
            </td></tr>
          </table>
        </td></tr>
        <tr><td bgcolor="#074B7D" style="padding: 30px; text-align: center; color: #FFFFFF; font-family: Arial, sans-serif; font-size: 12px;">
          1st Floor, CNM Centre, Ruiru Eastern Bypass, Nairobi, Kenya<br/>+254 799 488 488 | info@gatepathrealtors.com
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const template = await getTemplateOrDefault(caller.serviceClient, "task_reminder", {
      subject: defaultSubject,
      body: defaultBody,
    });
    const vars = {
      assigneeName: task.assigned_to_name ?? "there",
      taskTitle: task.title,
      dueText,
      details: task.description ? `Details: ${task.description}` : "",
    };
    const subject = renderTemplate(template.subject, vars);
    const emailHtml = renderTemplate(template.body, vars);

    // admin_users has no phone column today, so an SMS reminder isn't
    // possible yet — email-only until that field exists.
    const emailResult = await sendResendEmail(task.assigned_to_email, subject, emailHtml);

    return { success: true, emailResult };
  });
