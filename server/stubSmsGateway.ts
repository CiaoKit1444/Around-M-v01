/**
 * Stub SMS Gateway — simulates Twilio/DTAC SMS & WhatsApp API response shapes.
 *
 * This module is a drop-in stub that mirrors the real Twilio Messaging API
 * response structure so that when a real API key is available, only the
 * `sendSms` / `sendWhatsApp` implementations need to be swapped — all
 * callers and tests remain unchanged.
 *
 * Configurable via environment variables:
 *   STUB_SMS_FAILURE_MODE=none|network|invalid_number|rate_limit|timeout
 *     Controls which failure scenario is simulated (default: none).
 *   STUB_SMS_DELAY_MS=<number>
 *     Artificial latency in milliseconds (default: 120).
 *
 * Real provider swap guide (when API key is available):
 *   1. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in secrets.
 *   2. Replace the `stubDispatch` function below with the real Twilio SDK call.
 *   3. Remove this file and update the import in requestsRouter.ts.
 */

import { nanoid } from "nanoid";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SmsChannel = "sms" | "whatsapp";

export type SmsStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "failed"
  | "undelivered";

/** Mirrors Twilio MessageInstance shape */
export interface SmsDeliveryReceipt {
  /** Provider message SID (e.g. SM... for Twilio) */
  sid: string;
  /** Normalised E.164 destination number */
  to: string;
  /** Sender number / WhatsApp sender ID */
  from: string;
  /** Message body sent */
  body: string;
  /** Delivery status at dispatch time */
  status: SmsStatus;
  /** Number of SMS segments (1 per 160 chars for GSM-7) */
  numSegments: number;
  /** Cost per segment in USD (null when unknown) */
  pricePerSegment: string | null;
  /** ISO-8601 timestamp */
  dateCreated: string;
  /** Channel used */
  channel: SmsChannel;
  /** True when this is a stub response */
  stub: true;
  /** Error code if status is failed/undelivered */
  errorCode?: string;
  /** Human-readable error message */
  errorMessage?: string;
}

export type SmsFailureMode =
  | "none"
  | "network"
  | "invalid_number"
  | "rate_limit"
  | "timeout";

// ── Config ────────────────────────────────────────────────────────────────────

function getFailureMode(): SmsFailureMode {
  const mode = process.env.STUB_SMS_FAILURE_MODE ?? "none";
  const valid: SmsFailureMode[] = ["none", "network", "invalid_number", "rate_limit", "timeout"];
  return valid.includes(mode as SmsFailureMode) ? (mode as SmsFailureMode) : "none";
}

function getDelayMs(): number {
  const d = parseInt(process.env.STUB_SMS_DELAY_MS ?? "120", 10);
  return isNaN(d) ? 120 : Math.max(0, d);
}

/** Normalise phone to E.164 format (Thai numbers: 0X → +66X) */
export function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("66")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+66${digits.slice(1)}`;
  if (digits.length >= 10) return `+${digits}`;
  return phone; // Return as-is if we can't normalise
}

/** Count SMS segments (GSM-7: 160 chars per segment) */
function countSegments(body: string): number {
  return Math.ceil(body.length / 160);
}

/** Simulate async network delay */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Failure scenarios ─────────────────────────────────────────────────────────

const FAILURE_SCENARIOS: Record<
  Exclude<SmsFailureMode, "none">,
  { errorCode: string; errorMessage: string; status: SmsStatus }
> = {
  network: {
    errorCode: "30006",
    errorMessage: "Landline or unreachable carrier",
    status: "failed",
  },
  invalid_number: {
    errorCode: "21211",
    errorMessage: "Invalid 'To' Phone Number",
    status: "undelivered",
  },
  rate_limit: {
    errorCode: "14107",
    errorMessage: "Rate limit exceeded — too many messages sent in a short period",
    status: "failed",
  },
  timeout: {
    errorCode: "30008",
    errorMessage: "Unknown error — carrier timeout",
    status: "undelivered",
  },
};

// ── Core stub dispatch ────────────────────────────────────────────────────────

/**
 * Simulate sending an SMS or WhatsApp message.
 *
 * @param to      Destination phone number (any format; normalised internally)
 * @param body    Message text
 * @param channel "sms" | "whatsapp"
 * @returns       Twilio-shaped delivery receipt
 */
export async function stubDispatch(
  to: string,
  body: string,
  channel: SmsChannel
): Promise<SmsDeliveryReceipt> {
  const delayMs = getDelayMs();
  await delay(delayMs);

  const failureMode = getFailureMode();
  const normalisedTo = normalisePhone(to);
  const sid = channel === "whatsapp"
    ? `WA${nanoid(32).toUpperCase()}`
    : `SM${nanoid(32).toUpperCase()}`;
  const from = channel === "whatsapp" ? "whatsapp:+66800000000" : "+66800000000";
  const numSegments = countSegments(body);
  const dateCreated = new Date().toISOString();

  // Log to server console for observability
  console.log(
    `[SMS STUB] ${channel.toUpperCase()} → ${normalisedTo} | mode=${failureMode} | segments=${numSegments} | body="${body.slice(0, 60)}${body.length > 60 ? "…" : ""}"`
  );

  if (failureMode !== "none") {
    const scenario = FAILURE_SCENARIOS[failureMode];
    return {
      sid,
      to: normalisedTo,
      from,
      body,
      status: scenario.status,
      numSegments,
      pricePerSegment: null,
      dateCreated,
      channel,
      stub: true,
      errorCode: scenario.errorCode,
      errorMessage: scenario.errorMessage,
    };
  }

  return {
    sid,
    to: normalisedTo,
    from,
    body,
    status: "queued",
    numSegments,
    pricePerSegment: channel === "sms" ? "0.0075" : "0.0050",
    dateCreated,
    channel,
    stub: true,
  };
}

/**
 * Convenience wrapper for SMS.
 */
export async function sendSms(to: string, body: string): Promise<SmsDeliveryReceipt> {
  return stubDispatch(to, body, "sms");
}

/**
 * Convenience wrapper for WhatsApp.
 */
export async function sendWhatsApp(to: string, body: string): Promise<SmsDeliveryReceipt> {
  return stubDispatch(to, body, "whatsapp");
}
