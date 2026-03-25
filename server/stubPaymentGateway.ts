/**
 * Stub Payment Gateway — Sprint 5
 *
 * Blackbox mock of the Omise / PromptPay QR payment flow.
 * Replace this module with real Omise SDK calls once API keys are available.
 *
 * Stub behaviour:
 *   - generateQR()  → returns a fake PromptPay QR payload + charge ID
 *   - pollStatus()  → simulates payment confirmation after ~15 seconds
 *   - refund()      → always succeeds (no-op)
 *
 * The stub uses an in-memory store keyed by chargeId so the polling
 * endpoint can track simulated state without a real PGW.
 */

import { nanoid } from "nanoid";

// ── In-memory charge store (cleared on server restart) ──────────────────────

interface StubCharge {
  chargeId: string;
  requestId: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  createdAt: Date;
  paidAt?: Date;
  /** Auto-confirm after this timestamp (simulates customer scanning QR) */
  autoConfirmAt: Date;
}

const charges = new Map<string, StubCharge>();

// ── Public API ───────────────────────────────────────────────────────────────

export interface GenerateQRResult {
  chargeId: string;
  /** Base64-encoded PNG of the QR code (stub: a static placeholder data URI) */
  qrDataUrl: string;
  /** PromptPay payload string (stub: fake EMV QR) */
  qrPayload: string;
  amount: number;
  currency: string;
  expiresAt: Date;
}

/**
 * Generate a PromptPay QR charge.
 * Stub: creates an in-memory charge and returns a placeholder QR.
 * Real: POST /charges to Omise API with source type=promptpay.
 */
export function generateQR(params: {
  requestId: string;
  amount: number; // in THB (not satang)
  currency?: string;
  description?: string;
}): GenerateQRResult {
  const chargeId = `ch_stub_${nanoid(10)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 min
  // Auto-confirm after 15 seconds (demo speed — real PGW uses webhook)
  const autoConfirmAt = new Date(now.getTime() + 15 * 1000);

  charges.set(chargeId, {
    chargeId,
    requestId: params.requestId,
    amount: params.amount,
    currency: params.currency ?? "THB",
    status: "PENDING",
    createdAt: now,
    autoConfirmAt,
  });

  // Stub QR: a simple SVG-based placeholder that looks like a QR code
  const qrPayload = `00020101021130${chargeId}5802TH5303764540${params.amount.toFixed(2)}6304ABCD`;

  // Inline SVG placeholder (real: use Omise's returned QR image URL)
  const qrDataUrl = buildStubQrSvg(params.amount, chargeId);

  return {
    chargeId,
    qrDataUrl,
    qrPayload,
    amount: params.amount,
    currency: params.currency ?? "THB",
    expiresAt,
  };
}

/**
 * Poll charge status.
 * Stub: returns PAID once autoConfirmAt has passed.
 * Real: GET /charges/:id from Omise API.
 */
export function pollChargeStatus(chargeId: string): {
  chargeId: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  paidAt?: Date;
} {
  const charge = charges.get(chargeId);
  if (!charge) {
    return { chargeId, status: "FAILED" };
  }

  // Simulate auto-payment after delay
  if (charge.status === "PENDING" && new Date() >= charge.autoConfirmAt) {
    charge.status = "PAID";
    charge.paidAt = new Date();
    charges.set(chargeId, charge);
  }

  return {
    chargeId,
    status: charge.status,
    paidAt: charge.paidAt,
  };
}

/**
 * Refund a charge.
 * Stub: marks as REFUNDED.
 * Real: POST /charges/:id/refunds to Omise API.
 */
export function refundCharge(chargeId: string): { success: boolean } {
  const charge = charges.get(chargeId);
  if (!charge || charge.status !== "PAID") return { success: false };
  charge.status = "REFUNDED";
  charges.set(chargeId, charge);
  return { success: true };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a simple SVG that visually resembles a QR code placeholder */
function buildStubQrSvg(amount: number, chargeId: string): string {
  const label = `฿${amount.toFixed(2)}`;
  const shortId = chargeId.slice(-6).toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="220" viewBox="0 0 200 220">
  <rect width="200" height="220" fill="white" rx="8"/>
  <!-- Outer border -->
  <rect x="10" y="10" width="180" height="180" fill="none" stroke="#1a1a1a" stroke-width="4" rx="4"/>
  <!-- Corner markers -->
  <rect x="18" y="18" width="40" height="40" fill="#1a1a1a" rx="2"/>
  <rect x="22" y="22" width="32" height="32" fill="white" rx="1"/>
  <rect x="26" y="26" width="24" height="24" fill="#1a1a1a" rx="1"/>
  <rect x="142" y="18" width="40" height="40" fill="#1a1a1a" rx="2"/>
  <rect x="146" y="22" width="32" height="32" fill="white" rx="1"/>
  <rect x="150" y="26" width="24" height="24" fill="#1a1a1a" rx="1"/>
  <rect x="18" y="142" width="40" height="40" fill="#1a1a1a" rx="2"/>
  <rect x="22" y="146" width="32" height="32" fill="white" rx="1"/>
  <rect x="26" y="150" width="24" height="24" fill="#1a1a1a" rx="1"/>
  <!-- Data modules (stub pattern) -->
  ${generateStubModules()}
  <!-- PromptPay logo area -->
  <rect x="80" y="80" width="40" height="40" fill="white" rx="4"/>
  <text x="100" y="97" text-anchor="middle" font-size="8" font-family="sans-serif" fill="#003087" font-weight="bold">PROMPT</text>
  <text x="100" y="108" text-anchor="middle" font-size="8" font-family="sans-serif" fill="#003087" font-weight="bold">PAY</text>
  <!-- Amount label -->
  <text x="100" y="205" text-anchor="middle" font-size="13" font-family="sans-serif" fill="#1a1a1a" font-weight="bold">${label}</text>
  <!-- Stub watermark -->
  <text x="100" y="218" text-anchor="middle" font-size="7" font-family="monospace" fill="#aaa">STUB·${shortId}</text>
</svg>`;

  const b64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}

function generateStubModules(): string {
  // Deterministic pseudo-random pattern for visual realism
  const modules: string[] = [];
  const seed = [1,0,1,1,0,1,0,1,1,0,1,0,0,1,1,0,1,0,1,1,0,0,1,1,0,1,0,1,0,1,
                1,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1,1,0,1,0,1,0,0,1,1,0,1,0,
                0,1,0,1,1,0,1,0,1,0,1,1,0,0,1,0,1,0,1,1,0,1,0,1,0,0,1,1,0,1];
  let idx = 0;
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      // Skip corner marker areas
      if ((row < 3 && col < 3) || (row < 3 && col > 5) || (row > 5 && col < 3)) continue;
      if (seed[idx % seed.length]) {
        const x = 70 + col * 7;
        const y = 70 + row * 7;
        modules.push(`<rect x="${x}" y="${y}" width="6" height="6" fill="#1a1a1a"/>`);
      }
      idx++;
    }
  }
  return modules.join("\n  ");
}
