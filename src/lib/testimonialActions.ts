/**
 * Gatepath Realtors — Referral & Testimonial Outreach (Server Functions)
 *
 * Same pattern as taskActions.ts/buyerPreferenceActions.ts: service-role
 * client, caller re-verified server-side, any staff role — sending a
 * thank-you/referral email is routine relationship-management outreach,
 * not a sensitive write, matching Tasks'/Property Matching's gate rather
 * than Commission's/Goals' elevated CEO/manager-only one.
 *
 * "Handover-eligible" is checked server-side too (agreements.ceo_signed),
 * not just trusted from the client — defense in depth, same as every
 * other server function this session.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";
import { sendResendEmail } from "./notifications";
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

async function loadHandoverEligibleInquiry(serviceClient: any, inquiryId: string) {
  const { data: inquiry } = await serviceClient
    .from("inquiries")
    .select("*")
    .eq("id", inquiryId)
    .maybeSingle();
  if (!inquiry) return { inquiry: null, eligible: false };

  const { data: agreement } = await serviceClient
    .from("agreements")
    .select("ceo_signed")
    .eq("inquiry_id", inquiryId)
    .eq("ceo_signed", true)
    .maybeSingle();

  return { inquiry, eligible: !!agreement };
}

export const sendTestimonialRequestFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; inquiryId: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyStaffCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { inquiry, eligible } = await loadHandoverEligibleInquiry(
      caller.serviceClient,
      data.inquiryId,
    );
    if (!inquiry) return { success: false, error: "Client not found." };
    if (!eligible) {
      return { success: false, error: "This deal isn't fully paid/finalized yet." };
    }

    const defaultSubject = `We'd love to hear from you — Gatepath Realtors`;
    const defaultBody = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><title>Share Your Experience</title></head>
<body style="margin: 0; padding: 0; background-color: #F8F4EE; font-family: Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="padding: 40px 0 30px 0;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; border: 1px solid #E5E0D8; background-color: #FFFFFF; border-radius: 12px; overflow: hidden;">
        <tr><td align="center" bgcolor="#0B7FC7" style="padding: 40px 0 30px 0; color: #FFFFFF; font-size: 24px; font-weight: bold;">GATEPATH REALTORS</td></tr>
        <tr><td style="padding: 40px 30px 40px 30px;">
          <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">Hello <strong>${inquiry.client_full_name}</strong>,</p>
          <p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 22px; color: #666666; margin-bottom: 20px;">
            Congratulations on completing your purchase with Gatepath Realtors! We'd love to hear
            about your experience — sign in to your client portal and leave a short testimonial.
          </p>
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 10px;">
            <tr><td align="center">
              <table border="0" cellpadding="0" cellspacing="0" style="background-color: #E8A020; border-radius: 8px;">
                <tr><td align="center" style="padding: 14px 30px;">
                  <a href="https://gatepathrealtors.com/portal" target="_blank" style="color: #FFFFFF; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; text-decoration: none; display: inline-block;">
                    Share Your Experience →
                  </a>
                </td></tr>
              </table>
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

    const template = await getTemplateOrDefault(caller.serviceClient, "testimonial_request", {
      subject: defaultSubject,
      body: defaultBody,
    });
    const vars = { clientName: inquiry.client_full_name };
    const subject = renderTemplate(template.subject, vars);
    const emailHtml = renderTemplate(template.body, vars);

    const emailResult = await sendResendEmail(inquiry.client_email, subject, emailHtml);
    if (!emailResult.success) {
      return { success: false, error: emailResult.error || "Could not send the email." };
    }

    await caller.serviceClient
      .from("inquiries")
      .update({ testimonial_requested_at: new Date().toISOString() })
      .eq("id", data.inquiryId);

    return { success: true, emailResult };
  });

export const sendReferralInviteFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; inquiryId: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyStaffCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { inquiry, eligible } = await loadHandoverEligibleInquiry(
      caller.serviceClient,
      data.inquiryId,
    );
    if (!inquiry) return { success: false, error: "Client not found." };
    if (!eligible) {
      return { success: false, error: "This deal isn't fully paid/finalized yet." };
    }

    const defaultSubject = `Know someone looking for land in Kenya? — Gatepath Realtors`;
    const defaultBody = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><title>Refer a Friend</title></head>
<body style="margin: 0; padding: 0; background-color: #F8F4EE; font-family: Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="padding: 40px 0 30px 0;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; border: 1px solid #E5E0D8; background-color: #FFFFFF; border-radius: 12px; overflow: hidden;">
        <tr><td align="center" bgcolor="#0B7FC7" style="padding: 40px 0 30px 0; color: #FFFFFF; font-size: 24px; font-weight: bold;">GATEPATH REALTORS</td></tr>
        <tr><td style="padding: 40px 30px 40px 30px;">
          <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">Hello <strong>${inquiry.client_full_name}</strong>,</p>
          <p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 22px; color: #666666; margin-bottom: 20px;">
            Thank you for being a Gatepath Realtors client. If you know friends or family looking
            to invest in land, join our referral partner program and earn a commission on every
            successful referral.
          </p>
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 10px;">
            <tr><td align="center">
              <table border="0" cellpadding="0" cellspacing="0" style="background-color: #E8A020; border-radius: 8px;">
                <tr><td align="center" style="padding: 14px 30px;">
                  <a href="https://gatepathrealtors.com/partner" target="_blank" style="color: #FFFFFF; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; text-decoration: none; display: inline-block;">
                    Join the Referral Program →
                  </a>
                </td></tr>
              </table>
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

    const template = await getTemplateOrDefault(caller.serviceClient, "referral_invite", {
      subject: defaultSubject,
      body: defaultBody,
    });
    const vars = { clientName: inquiry.client_full_name };
    const subject = renderTemplate(template.subject, vars);
    const emailHtml = renderTemplate(template.body, vars);

    const emailResult = await sendResendEmail(inquiry.client_email, subject, emailHtml);
    if (!emailResult.success) {
      return { success: false, error: emailResult.error || "Could not send the email." };
    }

    await caller.serviceClient
      .from("inquiries")
      .update({ referral_invite_sent_at: new Date().toISOString() })
      .eq("id", data.inquiryId);

    return { success: true, emailResult };
  });
