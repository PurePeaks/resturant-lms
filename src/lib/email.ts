import nodemailer, { type Transporter } from "nodemailer";

// Outgoing email through Gmail (SMTP with an App Password).
//
// Set GMAIL_USER and GMAIL_APP_PASSWORD to turn email on. Until both are set,
// isEmailConfigured() is false and every flow falls back to its non-email path
// (temporary passwords handed over by a manager, inquiries visible only in the
// super admin dashboard). SMTP_HOST / SMTP_PORT only need setting to send
// through a different provider.

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

function emailConfig(): EmailConfig | null {
  const user = process.env.GMAIL_USER?.trim();
  // Google shows App Passwords in groups of four; the spaces are optional.
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) return null;

  const fromName = process.env.EMAIL_FROM_NAME?.trim() || "Himalayan Reserves";
  return {
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 465,
    user,
    pass,
    // Gmail only sends as the signed-in account (or an alias added under
    // "Send mail as"), so the From address is always GMAIL_USER.
    from: `"${fromName.replace(/"/g, "")}" <${user}>`,
  };
}

export function isEmailConfigured(): boolean {
  return emailConfig() !== null;
}

let cached: { key: string; transporter: Transporter } | null = null;

function transporterFor(config: EmailConfig): Transporter {
  const key = `${config.host}:${config.port}:${config.user}`;
  if (!cached || cached.key !== key) {
    cached = {
      key,
      transporter: nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass },
      }),
    };
  }
  return cached.transporter;
}

/**
 * Sends an email. Returns false (and logs why) when email isn't configured or
 * the send fails, so callers can fall back instead of erroring.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const config = emailConfig();
  if (!config) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:dev] To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`);
    }
    return false;
  }

  try {
    await transporterFor(config).sendMail({ from: config.from, ...message });
    return true;
  } catch (err) {
    // The recipient address is personal data; the subject is enough to trace it.
    console.error(`[email] failed to send "${message.subject}":`, err instanceof Error ? err.message : err);
    return false;
  }
}
