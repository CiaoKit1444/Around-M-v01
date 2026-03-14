/**
 * Email Service — Optional SMTP email delivery for Peppr Around.
 *
 * Currently uses the built-in Manus notifyOwner() as the primary delivery
 * mechanism. When SMTP credentials are configured via environment variables,
 * emails will be sent directly to the user's email address.
 *
 * Environment variables (set via Settings > Secrets):
 *   SMTP_HOST     — SMTP server hostname (e.g., smtp.gmail.com)
 *   SMTP_PORT     — SMTP port (default: 465 for SSL, 587 for STARTTLS)
 *   SMTP_USER     — SMTP username / email address
 *   SMTP_PASS     — SMTP password or app-specific password
 *   SMTP_FROM     — Sender "From" address (defaults to SMTP_USER)
 */
import { notifyOwner } from "./_core/notification";

// ── Types ────────────────────────────────────────────────────────────────────

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface PasswordResetEmailOptions {
  to: string;
  userName: string;
  resetLink: string;
  expiresIn: string;
}

// ── SMTP Configuration ──────────────────────────────────────────────────────

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) return null;
  return { host, port, user, pass, from };
}

// ── Email Sending ────────────────────────────────────────────────────────────

/**
 * Send an email via SMTP if configured, otherwise fall back to owner notification.
 * Returns true if the email was sent successfully.
 */
async function sendEmail(options: EmailOptions): Promise<boolean> {
  const smtp = getSmtpConfig();

  if (smtp) {
    try {
      // Dynamic import to avoid requiring nodemailer when not configured
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.pass },
      });

      await transporter.sendMail({
        from: `"Peppr Around" <${smtp.from}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      console.log(`[Email] Sent to ${options.to}: ${options.subject}`);
      return true;
    } catch (err) {
      console.error("[Email] SMTP send failed:", err);
      // Fall through to owner notification
    }
  }

  // Fallback: notify project owner
  try {
    await notifyOwner({
      title: `Email for ${options.to}: ${options.subject}`,
      content: `Recipient: ${options.to}\n\n${options.text}`,
    });
    console.log(`[Email] Notified owner (SMTP not configured) for: ${options.to}`);
    return true;
  } catch (err) {
    console.error("[Email] Owner notification also failed:", err);
    return false;
  }
}

// ── Password Reset Email ─────────────────────────────────────────────────────

/**
 * Send a password reset email to the user.
 * Uses SMTP if configured, otherwise notifies the project owner.
 */
export async function sendPasswordResetEmail(options: PasswordResetEmailOptions): Promise<boolean> {
  const { to, userName, resetLink, expiresIn } = options;

  const subject = "Peppr Around — Password Reset Request";

  const text = [
    `Hi ${userName},`,
    "",
    "We received a request to reset your password for your Peppr Around account.",
    "",
    `Click the link below to reset your password (valid for ${expiresIn}):`,
    resetLink,
    "",
    "If you did not request this, you can safely ignore this email.",
    "",
    "— Peppr Around Team",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #171717; font-size: 24px; margin: 0;">Peppr Around</h1>
      <p style="color: #737373; font-size: 14px; margin: 4px 0 0;">Password Reset</p>
    </div>
    <p style="color: #171717; font-size: 16px; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
    <p style="color: #525252; font-size: 15px; line-height: 1.6;">We received a request to reset your password. Click the button below to choose a new password:</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetLink}" style="display: inline-block; background: #171717; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">Reset Password</a>
    </div>
    <p style="color: #737373; font-size: 13px; line-height: 1.5;">This link expires in <strong>${expiresIn}</strong>. If you didn't request a password reset, you can safely ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
    <p style="color: #a3a3a3; font-size: 12px; text-align: center;">Peppr Around — Hospitality Management Platform</p>
  </div>
</body>
</html>`.trim();

  return sendEmail({ to, subject, text, html });
}

// ── Welcome / Invite Email ───────────────────────────────────────────────────

interface WelcomeEmailOptions {
  to: string;
  userName: string;
  tempPassword: string;
  loginUrl: string;
  invitedBy?: string;
}

/**
 * Send a welcome email to a newly invited user with their temporary password.
 * Uses SMTP if configured, otherwise notifies the project owner.
 */
export async function sendWelcomeEmail(options: WelcomeEmailOptions): Promise<boolean> {
  const { to, userName, tempPassword, loginUrl, invitedBy } = options;

  const subject = "Welcome to Peppr Around — Your account is ready";

  const invitedByLine = invitedBy ? `You were invited by ${invitedBy}.` : "Your account has been created by an administrator.";

  const text = [
    `Hi ${userName},`,
    "",
    `Welcome to Peppr Around! ${invitedByLine}`,
    "",
    "Your login credentials:",
    `  Email:    ${to}`,
    `  Password: ${tempPassword}`,
    "",
    "Please sign in and change your password immediately:",
    loginUrl,
    "",
    "If you did not expect this invitation, please contact your administrator.",
    "",
    "— Peppr Around Team",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #171717; font-size: 24px; margin: 0;">Peppr Around</h1>
      <p style="color: #737373; font-size: 14px; margin: 4px 0 0;">You have been invited</p>
    </div>
    <p style="color: #171717; font-size: 16px; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
    <p style="color: #525252; font-size: 15px; line-height: 1.6;">${invitedByLine} Use the credentials below to sign in for the first time.</p>
    <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 24px 0; font-family: monospace;">
      <p style="margin: 0 0 8px; color: #525252; font-size: 13px;"><strong>Email</strong></p>
      <p style="margin: 0 0 16px; color: #171717; font-size: 15px;">${to}</p>
      <p style="margin: 0 0 8px; color: #525252; font-size: 13px;"><strong>Temporary Password</strong></p>
      <p style="margin: 0; color: #171717; font-size: 15px; letter-spacing: 0.05em;">${tempPassword}</p>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: #171717; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">Sign In Now</a>
    </div>
    <p style="color: #737373; font-size: 13px; line-height: 1.5;">Please change your password immediately after signing in. If you did not expect this invitation, contact your administrator.</p>
    <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
    <p style="color: #a3a3a3; font-size: 12px; text-align: center;">Peppr Around — Hospitality Management Platform</p>
  </div>
</body>
</html>`.trim();

  return sendEmail({ to, subject, text, html });
}

/**
 * Check if direct SMTP email delivery is configured.
 * When false, emails fall back to owner notification.
 */
export function isSmtpConfigured(): boolean {
  return getSmtpConfig() !== null;
}
