/**
 * Gatepath Realtors — Commission Actions (Server Functions)
 *
 * Same pattern as documentVaultActions.ts: service-role client, caller
 * re-verified server-side, CEO/manager only — these are compensation-
 * administration actions (setting a rate, marking money paid, sending an
 * official statement), a stricter gate than the routine-work default,
 * matching Document Vault's deletion gate reasoning. Viewing the
 * Commissions screen itself is open to any staff role (Agent Performance
 * already shows every agent's revenue/conversion openly to the team).
 */
import { createServerFn } from "@tanstack/react-start";
// Module 3 audit finding #8: this file's own verify-caller implementation
// is consolidated into src/lib/serverAuth.ts.
import { verifyManagerCaller } from "./serverAuth";
import { sendResendEmail } from "./notifications";
import { computeAgentCommissions } from "./commissions";
import { getTemplateOrDefault, renderTemplate } from "./messageTemplateActions";
import type { AdminUser, Inquiry, Agreement } from "./types";

export const updateAgentCommissionRateFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; agentUserId: string; commissionRate: number }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await caller.serviceClient
      .from("admin_users")
      .update({ commission_rate: data.commissionRate })
      .eq("id", data.agentUserId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  });

export const markCommissionPaidFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      inquiryId: string;
      agentEmail: string;
      agentName: string | null;
      commissionRateApplied: number;
      commissionAmountKes: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await caller.serviceClient.from("commission_payouts").insert({
      inquiry_id: data.inquiryId,
      agent_email: data.agentEmail,
      agent_name: data.agentName,
      commission_rate_applied: data.commissionRateApplied,
      commission_amount_kes: data.commissionAmountKes,
      paid_by_email: caller.caller.email,
      paid_by_name: caller.caller.full_name,
    });

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "This deal's commission is already marked paid." };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  });

export const sendCommissionStatementFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; agentEmail: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const [agentsRes, inquiriesRes, agreementsRes, paymentsRes, payoutsRes] = await Promise.all([
      caller.serviceClient.from("admin_users").select("*"),
      caller.serviceClient.from("inquiries").select("id, client_full_name, cro_name"),
      caller.serviceClient.from("agreements").select("inquiry_id, ceo_signed"),
      caller.serviceClient.from("payments").select("inquiry_id, amount").eq("status", "success"),
      caller.serviceClient.from("commission_payouts").select("inquiry_id, agent_email"),
    ]);

    const agent = ((agentsRes.data as AdminUser[]) ?? []).find((a) => a.email === data.agentEmail);
    if (!agent) return { success: false, error: "Agent not found." };
    if (!agent.commission_rate) {
      return { success: false, error: "This agent has no commission rate set yet." };
    }

    const summaries = computeAgentCommissions(
      (agentsRes.data as AdminUser[]) ?? [],
      (inquiriesRes.data as Pick<Inquiry, "id" | "client_full_name" | "cro_name">[]) ?? [],
      (agreementsRes.data as Pick<Agreement, "inquiry_id" | "ceo_signed">[]) ?? [],
      (paymentsRes.data as { inquiry_id: string | null; amount: number }[]) ?? [],
      (payoutsRes.data as { inquiry_id: string; agent_email: string }[]) ?? [],
    );
    const summary = summaries.find((s) => s.agent.email === data.agentEmail);
    if (!summary) return { success: false, error: "No commission activity for this agent yet." };

    const rows = summary.deals
      .map(
        (d) =>
          `<tr><td style="padding:10px 0;border-bottom:1px solid #E5E0D8;font-family:Arial,sans-serif;font-size:14px;color:#333333;">
            <strong>${d.clientName}</strong> — Ksh ${d.commissionAmountKes.toLocaleString()} — ${d.paid ? "Paid" : "Pending"}
          </td></tr>`,
      )
      .join("");

    const defaultSubject = `Commission Statement — Gatepath Realtors`;
    const defaultBody = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><title>Commission Statement</title></head>
<body style="margin: 0; padding: 0; background-color: #F8F4EE; font-family: Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="padding: 40px 0 30px 0;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; border: 1px solid #E5E0D8; background-color: #FFFFFF; border-radius: 12px; overflow: hidden;">
        <tr><td align="center" bgcolor="#074B7D" style="padding: 40px 0 30px 0; color: #FFFFFF; font-size: 24px; font-weight: bold;">GATEPATH REALTORS</td></tr>
        <tr><td style="padding: 40px 30px 40px 30px;">
          <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">Hello <strong>${agent.full_name ?? agent.email}</strong>,</p>
          <p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 22px; color: #666666; margin-bottom: 20px;">
            Here is your current commission summary (${summary.dealCount} closed deal${summary.dealCount === 1 ? "" : "s"}):
          </p>
          <table border="0" cellpadding="12" cellspacing="0" width="100%" style="background-color: #F8F4EE; border: 1px solid #E5E0D8; border-radius: 8px; margin-bottom: 20px;">
            ${rows}
          </table>
          <p style="font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
            <strong>Total Commission:</strong> Ksh ${summary.totalCommissionKes.toLocaleString()}<br/>
            <strong>Paid:</strong> Ksh ${summary.paidKes.toLocaleString()}<br/>
            <strong>Pending:</strong> Ksh ${summary.pendingKes.toLocaleString()}
          </p>
        </td></tr>
        <tr><td bgcolor="#074B7D" style="padding: 30px; text-align: center; color: #FFFFFF; font-family: Arial, sans-serif; font-size: 12px;">
          1st Floor, CNM Centre, Ruiru Eastern Bypass, Nairobi, Kenya<br/>+254 799 488 488 | info@gatepathrealtors.com
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const template = await getTemplateOrDefault(caller.serviceClient, "commission_statement", {
      subject: defaultSubject,
      body: defaultBody,
    });
    const vars = {
      agentName: agent.full_name ?? agent.email,
      dealCount: String(summary.dealCount),
      totalCommissionKes: summary.totalCommissionKes.toLocaleString(),
      paidKes: summary.paidKes.toLocaleString(),
      pendingKes: summary.pendingKes.toLocaleString(),
    };
    const subject = renderTemplate(template.subject, vars);
    const emailHtml = renderTemplate(template.body, vars);

    const emailResult = await sendResendEmail(agent.email, subject, emailHtml);
    return { success: true, emailResult };
  });
