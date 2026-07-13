/**
 * Gatepath Realtors — Notifications Service (Server Functions)
 * Handles sending Outlook-compatible HTML emails (via Resend) and SMS alerts (via Africa's Talking).
 */
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "./supabase";

/**
 * Sends a regional SMS via Africa's Talking API (pure HTTP implementation)
 */
export async function sendAfricaTalkingSms(
  to: string,
  message: string,
  envVars: { apiKey?: string; username?: string; senderId?: string } = {}
) {
  // Read keys from environment
  const apiKey = envVars.apiKey || (typeof process !== "undefined" ? process.env.AFRICAS_TALKING_API_KEY : "") || "";
  const username = envVars.username || (typeof process !== "undefined" ? process.env.AFRICAS_TALKING_USERNAME : "") || "sandbox";
  const senderId = envVars.senderId || (typeof process !== "undefined" ? process.env.AFRICAS_TALKING_SENDER_ID : "") || "";

  if (!apiKey || apiKey === "") {
    console.warn("[Gatepath SMS] Africa's Talking API Key not configured. Skipping SMS send.");
    return { success: false, error: "Missing API Key" };
  }

  // Format phone number to E.164 (e.g. +254799488488)
  let formattedTo = to.trim().replace(/\s/g, "");
  if (formattedTo.startsWith("0")) {
    formattedTo = "+254" + formattedTo.slice(1);
  } else if (!formattedTo.startsWith("+")) {
    formattedTo = "+" + formattedTo;
  }

  const endpoint = username === "sandbox"
    ? "https://api.sandbox.africastalking.com/version1/messaging"
    : "https://api.africastalking.com/version1/messaging";

  const bodyParams = new URLSearchParams();
  bodyParams.append("username", username);
  bodyParams.append("to", formattedTo);
  bodyParams.append("message", message);
  if (senderId && senderId !== "") {
    bodyParams.append("from", senderId);
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "apiKey": apiKey,
      },
      body: bodyParams.toString(),
    });

    const data = await response.json();
    console.log("[Gatepath SMS] AT Response:", data);
    return { success: response.ok, data };
  } catch (err: any) {
    console.error("[Gatepath SMS] Send error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Sends an email via Resend API (pure HTTP implementation to prevent Workers ESM crashes)
 */
export async function sendResendEmail(
  to: string,
  subject: string,
  html: string,
  envVars: { apiKey?: string; fromEmail?: string } = {}
) {
  const apiKey = envVars.apiKey || (typeof process !== "undefined" ? process.env.RESEND_API_KEY : "") || "";
  const fromEmail = envVars.fromEmail || (typeof process !== "undefined" ? process.env.RESEND_FROM_EMAIL : "") || "Gatepath Realtors <noreply@gatepathrealtors.com>";

  if (!apiKey || apiKey === "") {
    console.warn("[Gatepath Email] Resend API Key not configured. Skipping Email send.");
    return { success: false, error: "Missing API Key" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const data = await response.json();
    console.log("[Gatepath Email] Resend Response:", data);
    return { success: response.ok, data };
  } catch (err: any) {
    console.error("[Gatepath Email] Send error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Bulletproof Outlook-Compatible HTML Reservation email template
 */
export function getReservationEmailHtml(params: {
  buyerName: string;
  plotNumber: string;
  phaseName: string;
  amount: number;
  reference: string;
  isHold: boolean;
  visitDate?: string;
  transportMode?: string;
}) {
  const title = params.isHold ? "Plot Reservation Hold" : "Plot Purchase Secured";
  const statusMessage = params.isHold
    ? `Your Ksh ${params.amount.toLocaleString()} holding fee has been received. Plot #${params.plotNumber} is now held for you for 14 days.`
    : `Your deposit of Ksh ${params.amount.toLocaleString()} for Plot #${params.plotNumber} has been received. Your purchase process has begun.`;

  const visitSection = params.visitDate
    ? `<tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #E5E0D8; font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
          <strong>Site Visit:</strong> ${params.visitDate} ${params.transportMode ? `via ${params.transportMode.toUpperCase()}` : ""}
        </td>
      </tr>`
    : "";

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F4EE; font-family: Arial, sans-serif;">
  <!-- Main Container Table -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8F4EE; padding: 20px 0;">
    <tr>
      <td align="center">
        <!-- Outlook-friendly 600px width card -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #FFFFFF; border: 1px solid #E5E0D8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          
          <!-- Banner Header -->
          <tr>
            <td align="center" bgcolor="#0B7FC7" style="padding: 40px 20px; text-align: center;">
              <!-- Centered logo icon -->
              <img src="https://hcnbgtnghvyyokspotfe.supabase.co/storage/v1/object/public/blog-assets/logo-icon.png" alt="Gatepath Realtors Logo" width="80" height="80" style="display: block; outline: none; border: none; margin-bottom: 15px;" />
              <h1 style="color: #FFFFFF; font-family: Arial, sans-serif; font-size: 26px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
                ${title}
              </h1>
              <p style="color: #E8A020; font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 2px;">
                Your Interest is Our Priority
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 30px; background-color: #FFFFFF;">
              <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333; margin: 0 0 20px 0;">
                Dear <strong>${params.buyerName}</strong>,
              </p>
              <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 24px; color: #555555; margin: 0 0 24px 0;">
                ${statusMessage} All details have been logged in our system. A summary of your transaction is listed below.
              </p>

              <!-- Transaction Summary Box -->
              <table border="0" cellpadding="12" cellspacing="0" width="100%" style="background-color: #F8F4EE; border: 1px solid #E5E0D8; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #E5E0D8; font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
                          <strong>Project Phase:</strong> ${params.phaseName}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #E5E0D8; font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
                          <strong>Plot Selected:</strong> Plot #${params.plotNumber}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #E5E0D8; font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
                          <strong>Amount Paid:</strong> Ksh ${params.amount.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #E5E0D8; font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
                          <strong>Payment Ref:</strong> ${params.reference}
                        </td>
                      </tr>
                      ${visitSection}
                    </table>
                  </td>
                </tr>
              </table>

              <p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 22px; color: #666666; margin: 0 0 30px 0;">
                Our legal team is preparing the official Purchase Agreement. Once reviewed, our CEO will sign it and you will receive a countersigned copy to view, download, or print directly from your portal.
              </p>
            </td>
          </tr>

          <!-- Footer Address (Ruiru Eastern Bypass) -->
          <tr>
            <td bgcolor="#0A3D62" style="padding: 30px; text-align: center; color: #FFFFFF; font-family: Arial, sans-serif; font-size: 12px; line-height: 20px;">
              <p style="margin: 0 0 10px 0; font-weight: bold; font-size: 13px; color: #E8A020;">
                GATEPATH REALTORS LIMITED
              </p>
              <p style="margin: 0 0 10px 0; color: #FFFFFF; opacity: 0.85;">
                🏢 1st Floor, CNM Centre, Ruiru Eastern Bypass, Nairobi, Kenya<br/>
                📞 +254 799 488 488 | ✉️ info@gatepathrealtors.com
              </p>
              <p style="margin: 20px 0 0 0; font-size: 11px; color: #FFFFFF; opacity: 0.5;">
                © 2026 Gatepath Realtors. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Bulletproof Outlook-Compatible HTML Agreement Signed email template
 */
export function getAgreementSignedEmailHtml(params: {
  buyerName: string;
  plotNumber: string;
  phaseName: string;
  agreementUrl: string;
}) {
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Agreement Signed By CEO</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F4EE; font-family: Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8F4EE; padding: 20px 0;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #FFFFFF; border: 1px solid #E5E0D8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          
          <!-- Banner Header -->
          <tr>
            <td align="center" bgcolor="#22C55E" style="padding: 40px 20px; text-align: center;">
              <img src="https://hcnbgtnghvyyokspotfe.supabase.co/storage/v1/object/public/blog-assets/logo-icon.png" alt="Gatepath Realtors Logo" width="80" height="80" style="display: block; outline: none; border: none; margin-bottom: 15px;" />
              <h1 style="color: #FFFFFF; font-family: Arial, sans-serif; font-size: 24px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
                Agreement Countersigned
              </h1>
              <p style="color: #FFFFFF; opacity: 0.9; font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px;">
                Gatepath Realtors Limited
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 30px; background-color: #FFFFFF;">
              <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333; margin: 0 0 20px 0;">
                Dear <strong>${params.buyerName}</strong>,
              </p>
              <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 24px; color: #555555; margin: 0 0 24px 0;">
                Congratulations! Your **Agreement for Sale** for **Plot #${params.plotNumber}** at **${params.phaseName}** has been officially signed and countersigned by our CEO/MD, **Joe Muchiri**.
              </p>
              <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 24px; color: #555555; margin: 0 0 30px 0;">
                You can now view, print, or download your legally binding copy of the agreement and your official payment receipt from your customer portal:
              </p>

              <!-- Bulletproof Button (Outlook compatible) -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 35px;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" style="background-color: #E8A020; border-radius: 8px;">
                      <tr>
                        <td align="center" style="padding: 14px 30px;">
                          <a href="${params.agreementUrl}" target="_blank" style="color: #FFFFFF; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; text-decoration: none; display: inline-block;">
                            View Signed Agreement & Receipt →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 22px; color: #666666; margin: 0;">
                If you have any questions or require hard copies delivered to your location, please respond to this email or reach out to your assigned Relationship Manager.
              </p>
            </td>
          </tr>

          <!-- Footer Address (Ruiru Eastern Bypass) -->
          <tr>
            <td bgcolor="#0A3D62" style="padding: 30px; text-align: center; color: #FFFFFF; font-family: Arial, sans-serif; font-size: 12px; line-height: 20px;">
              <p style="margin: 0 0 10px 0; font-weight: bold; font-size: 13px; color: #E8A020;">
                GATEPATH REALTORS LIMITED
              </p>
              <p style="margin: 0 0 10px 0; color: #FFFFFF; opacity: 0.85;">
                🏢 1st Floor, CNM Centre, Ruiru Eastern Bypass, Nairobi, Kenya<br/>
                📞 +254 799 488 488 | ✉️ info@gatepathrealtors.com
              </p>
              <p style="margin: 20px 0 0 0; font-size: 11px; color: #FFFFFF; opacity: 0.5;">
                © 2026 Gatepath Realtors. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Server Function: Dispatches reservation emails and SMS
 */
export const sendReservationNotificationFn = createServerFn({ method: "POST" })
  .validator((d: {
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    plotNumber: string;
    phaseName: string;
    amount: number;
    reference: string;
    isHold: boolean;
    visitDate?: string;
    transportMode?: string;
  }) => d)
  .handler(async ({ data }) => {
    console.log("[Notification ServerFn] Processing reservation hold notification...");

    // Generate HTML
    const emailHtml = getReservationEmailHtml({
      buyerName: data.buyerName,
      plotNumber: data.plotNumber,
      phaseName: data.phaseName,
      amount: data.amount,
      reference: data.reference,
      isHold: data.isHold,
      visitDate: data.visitDate,
      transportMode: data.transportMode,
    });

    const subject = data.isHold
      ? `Plot Reservation Confirmed: Plot #${data.plotNumber} — ${data.phaseName}`
      : `Payment Confirmed: Plot #${data.plotNumber} secured!`;

    // 1. Dispatch Email via Resend
    const emailResult = await sendResendEmail(data.buyerEmail, subject, emailHtml);

    // 2. Dispatch SMS via Africa's Talking
    const smsMessage = data.isHold
      ? `Thank you ${data.buyerName}! Your hold payment of Ksh ${data.amount.toLocaleString()} for Plot #${data.plotNumber} at ${data.phaseName} has been received. Ref: ${data.reference}. Valid for 14 days.`
      : `Payment Confirmed: Ksh ${data.amount.toLocaleString()} received for Plot #${data.plotNumber} at ${data.phaseName}. Gatepath Realtors Welcomes you!`;

    const smsResult = await sendAfricaTalkingSms(data.buyerPhone, smsMessage);

    return { emailResult, smsResult };
  });

/**
 * Server Function: Dispatches agreement signed notifications
 */
export const sendAgreementSignedNotificationFn = createServerFn({ method: "POST" })
  .validator((d: {
    inquiryId: string;
  }) => d)
  .handler(async ({ data }) => {
    console.log("[Notification ServerFn] Processing agreement signed notification...");

    // 1. Fetch details from database
    const { data: inquiry } = await supabase
      .from("inquiries")
      .select("*")
      .eq("id", data.inquiryId)
      .maybeSingle();

    if (!inquiry) {
      return { success: false, error: "Inquiry not found" };
    }

    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("inquiry_id", data.inquiryId)
      .maybeSingle();

    const agreementUrl = `http://localhost:5173/document/agreement/${data.inquiryId}`;

    // Generate HTML
    const emailHtml = getAgreementSignedEmailHtml({
      buyerName: inquiry.client_full_name,
      plotNumber: String(inquiry.plot_number_ref),
      phaseName: inquiry.phase_name || "",
      agreementUrl: agreementUrl,
    });

    const subject = `Agreement Signed: Plot #${inquiry.plot_number_ref} — ${inquiry.phase_name}`;

    // 2. Send Email
    const emailResult = await sendResendEmail(inquiry.client_email, subject, emailHtml);

    // 3. Send SMS
    const smsMessage = `Hello ${inquiry.client_full_name}, your Purchase Agreement for Plot #${inquiry.plot_number_ref} at ${inquiry.phase_name} has been signed by the CEO. View/download here: ${agreementUrl}`;
    const smsResult = await sendAfricaTalkingSms(inquiry.client_phone, smsMessage);

    // Update agreement table flags
    if (payment) {
      await supabase
        .from("agreements")
        .update({
          email_sent: emailResult.success,
          sms_sent: smsResult.success,
        })
        .eq("payment_id", payment.id);
    }

    return { success: true, emailResult, smsResult };
  });

/**
 * Server Function: Dispatches free site visit booking notifications
 */
export const sendSiteVisitNotificationFn = createServerFn({ method: "POST" })
  .validator((d: {
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    plotNumber: string;
    phaseName: string;
    visitDate: string;
    visitTime: string;
    transportMode: string;
    pickupLocation: string;
  }) => d)
  .handler(async ({ data }) => {
    console.log("[Notification ServerFn] Processing free site visit booking notification...");

    // Generate HTML for site visit confirmation (clean table design)
    const emailHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Site Visit Scheduled</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F4EE; font-family: Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td style="padding: 40px 0 30px 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; border: 1px solid #E5E0D8; background-color: #FFFFFF; border-radius: 12px; overflow: hidden;">
          <tr>
            <td align="center" bgcolor="#0A3D62" style="padding: 40px 0 30px 0; color: #FFFFFF; font-size: 24px; font-weight: bold; font-family: Arial, sans-serif;">
              GATEPATH REALTORS
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px 40px 30px;">
              <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">
                Hello <strong>${data.buyerName}</strong>,
              </p>
              <p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 22px; color: #666666; margin-bottom: 20px;">
                Your free site visit has been scheduled successfully. Our team will contact you shortly to confirm the meeting details.
              </p>
              <table border="0" cellpadding="12" cellspacing="0" width="100%" style="background-color: #F8F4EE; border: 1px solid #E5E0D8; border-radius: 8px;">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
                    <strong>Project:</strong> ${data.phaseName}<br/>
                    <strong>Plot Reference:</strong> Plot #${data.plotNumber}<br/>
                    <strong>Visit Date:</strong> ${data.visitDate}<br/>
                    <strong>Preferred Time:</strong> ${data.visitTime === "morning" ? "Morning (8:00 AM - 12:00 PM)" : "Afternoon (1:00 PM - 5:00 PM)"}<br/>
                    <strong>Means of Transport:</strong> ${data.transportMode.toUpperCase()}<br/>
                    <strong>Pickup Location:</strong> ${data.pickupLocation || "Self Transport"}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#0A3D62" style="padding: 30px; text-align: center; color: #FFFFFF; font-family: Arial, sans-serif; font-size: 12px;">
              🏢 1st Floor, CNM Centre, Ruiru Eastern Bypass, Nairobi, Kenya<br/>
              📞 +254 799 488 488 | ✉️ info@gatepathrealtors.com
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const subject = `Site Visit Scheduled: Plot #${data.plotNumber} — ${data.phaseName}`;
    const emailResult = await sendResendEmail(data.buyerEmail, subject, emailHtml);

    // SMS Message
    const transportStr = data.transportMode === "self" ? "Self Drive" : data.transportMode.toUpperCase();
    const pickupStr = data.transportMode === "self" ? "" : `, Pickup: ${data.pickupLocation}`;
    const smsMessage = `Hello ${data.buyerName}, your free site visit for Plot #${data.plotNumber} at ${data.phaseName} has been scheduled for ${data.visitDate} (${data.visitTime === "morning" ? "Morning" : "Afternoon"}). Transport: ${transportStr}${pickupStr}. Gatepath Realtors!`;

    const smsResult = await sendAfricaTalkingSms(data.buyerPhone, smsMessage);

    return { emailResult, smsResult };
  });
