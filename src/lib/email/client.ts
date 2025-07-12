import { Resend } from "resend";
import { env } from "~/env";

// Initialize Resend client
export const resend = new Resend(env.RESEND_API_KEY);

// Default sender email
export const DEFAULT_FROM = "Code Slate <noreply@codeslate.app>";

// Email sending function with error handling
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = DEFAULT_FROM,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}) {
  try {
    if (!env.RESEND_API_KEY) {
      console.warn("⚠️ RESEND_API_KEY not configured, email not sent");
      return { success: false, error: "Email service not configured" };
    }

    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });

    console.log("✅ Email sent successfully:", result.data?.id);
    return { success: true, data: result.data };
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
