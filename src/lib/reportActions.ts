/**
 * Gatepath Realtors — Report Actions (Server Functions)
 *
 * sendExecutiveReportFn is a manual "Send Report to CEO" trigger — real
 * scheduled/automated delivery needs a cron/trigger, which needs the still-
 * deferred Automation/n8n module (Part 2 Module 3, built last per the
 * user's own resequencing). Any staff member can trigger the send (it's an
 * email, not a sensitive write), same caller-verification pattern as every
 * other server function this session.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";
import { sendResendEmail } from "./notifications";
import { computeSourceRoi } from "./reportAnalytics";
import { getTemplateOrDefault, renderTemplate } from "./messageTemplateActions";
import type { Inquiry, Payment } from "./types";

export const sendExecutiveReportFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string }) => d)
  .handler(async ({ data }) => {
    const anonClient = getAnonClient();
    const { data: callerData, error: callerErr } = await anonClient.auth.getUser(
      data.callerAccessToken,
    );
    if (callerErr || !callerData.user?.email) {
      return { success: false, error: "Not authenticated." };
    }

    const serviceClient = getServiceClient();
    const { data: callerRow } = await serviceClient
      .from("admin_users")
      .select("id")
      .eq("email", callerData.user.email.toLowerCase())
      .maybeSingle();
    if (!callerRow) {
      return { success: false, error: "Not recognised as Gatepath staff." };
    }

    const { data: ceoRow } = await serviceClient
      .from("admin_users")
      .select("email, full_name")
      .eq("role", "ceo")
      .maybeSingle();
    if (!ceoRow) {
      return { success: false, error: "No CEO account found to send the report to." };
    }

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [inquiriesRes, paymentsRes] = await Promise.all([
      serviceClient.from("inquiries").select("*"),
      serviceClient.from("payments").select("*").eq("status", "success"),
    ]);
    const inquiries = (inquiriesRes.data as Inquiry[]) ?? [];
    const payments = (paymentsRes.data as Payment[]) ?? [];

    const pipelineValue = inquiries
      .filter((i) => i.status === "pending" || i.status === "reviewed")
      .reduce((sum, i) => sum + (i.price ?? 0), 0);
    const monthCollections = payments
      .filter((p) => p.created_at.slice(0, 7) === monthKey)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const approvedCount = inquiries.filter((i) => i.status === "approved").length;
    const teamConversionPct =
      inquiries.length > 0 ? Math.round((approvedCount / inquiries.length) * 100) : 0;
    const sourceRoi = computeSourceRoi(inquiries, payments);
    const bestSource = sourceRoi[0];

    const defaultSubject = `Gatepath Executive Report — ${now.toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}`;
    const defaultBody = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><title>Executive Report</title></head>
<body style="margin: 0; padding: 0; background-color: #F8F4EE; font-family: Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="padding: 40px 0 30px 0;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; border: 1px solid #E5E0D8; background-color: #FFFFFF; border-radius: 12px; overflow: hidden;">
        <tr><td align="center" bgcolor="#074B7D" style="padding: 40px 0 30px 0; color: #FFFFFF; font-size: 24px; font-weight: bold;">GATEPATH REALTORS</td></tr>
        <tr><td style="padding: 40px 30px 40px 30px;">
          <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">Hello <strong>${ceoRow.full_name ?? "there"}</strong>,</p>
          <p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 22px; color: #666666; margin-bottom: 20px;">
            Here is your executive summary as of today:
          </p>
          <table border="0" cellpadding="12" cellspacing="0" width="100%" style="background-color: #F8F4EE; border: 1px solid #E5E0D8; border-radius: 8px;">
            <tr><td style="font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
              <strong>Open Pipeline Value:</strong> Ksh ${pipelineValue.toLocaleString()}<br/>
              <strong>Collections This Month:</strong> Ksh ${monthCollections.toLocaleString()}<br/>
              <strong>Team Conversion Rate:</strong> ${teamConversionPct}%<br/>
              <strong>Best-Performing Source:</strong> ${bestSource ? `${bestSource.source} (Ksh ${bestSource.revenue.toLocaleString()} closed)` : "No data yet"}
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

    const template = await getTemplateOrDefault(serviceClient, "executive_report", {
      subject: defaultSubject,
      body: defaultBody,
    });
    const vars = {
      ceoName: ceoRow.full_name ?? "there",
      pipelineValue: pipelineValue.toLocaleString(),
      monthCollections: monthCollections.toLocaleString(),
      teamConversionPct: String(teamConversionPct),
      bestSource: bestSource
        ? `${bestSource.source} (Ksh ${bestSource.revenue.toLocaleString()} closed)`
        : "No data yet",
    };
    const subject = renderTemplate(template.subject, vars);
    const emailHtml = renderTemplate(template.body, vars);

    const emailResult = await sendResendEmail(ceoRow.email, subject, emailHtml);
    if (!emailResult.success) {
      return { success: false, error: emailResult.error ?? "Failed to send the report email." };
    }
    return { success: true, emailResult };
  });
