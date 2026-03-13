import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import axios from "axios";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { overseer } from "../overseer";

/**
 * Check if an email is on the SSO allowlist in the FastAPI backend.
 * Returns true if the allowlist is empty (open access) or if the email is found.
 * Returns false if the allowlist has entries and the email is NOT in it.
 */
async function checkSsoAllowlist(email: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const backendUrl = overseer.resolve("fastapi");
    const resp = await axios.get(`${backendUrl}/v1/admin/sso-allowlist`, {
      timeout: 5000,
    });
    const entries: Array<{ email: string; is_active?: boolean }> = resp.data?.items ?? [];

    // If no entries, allowlist is not configured — allow all
    if (entries.length === 0) return { allowed: true };

    const activeEntries = entries.filter((e) => e.is_active !== false);
    if (activeEntries.length === 0) return { allowed: true };

    const found = activeEntries.some(
      (e) => e.email.toLowerCase() === email.toLowerCase()
    );
    if (found) return { allowed: true };

    return { allowed: false, reason: `${email} is not on the SSO allowlist` };
  } catch {
    // If FastAPI is unreachable, fail open (allow login) to avoid locking everyone out
    console.warn("[OAuth] SSO allowlist check failed — failing open");
    return { allowed: true };
  }
}

/**
 * Parse the OAuth state parameter.
 * The state can be either:
 *  - A plain base64-encoded redirect URI (legacy)
 *  - A base64-encoded JSON object with { origin, returnPath, mode }
 */
function parseState(state: string): {
  origin: string;
  returnPath: string;
  mode?: string;
  redirectUri?: string;
} {
  try {
    const decoded = Buffer.from(state, "base64").toString("utf-8");
    // Try JSON first
    if (decoded.startsWith("{")) {
      const parsed = JSON.parse(decoded);
      return {
        origin: parsed.origin ?? "",
        returnPath: parsed.returnPath ?? "/",
        mode: parsed.mode ?? undefined,
        redirectUri: undefined,
      };
    }
    // Plain redirect URI (legacy format)
    return {
      origin: "",
      returnPath: "/",
      mode: undefined,
      redirectUri: decoded,
    };
  } catch {
    return { origin: "", returnPath: "/", mode: undefined, redirectUri: undefined };
  }
}

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const parsedState = parseState(state);

      // Debug: log full userInfo so we can see what the Manus OAuth portal returns
      console.log("[OAuth] userInfo received:", JSON.stringify({
        openId: userInfo.openId,
        name: userInfo.name,
        email: userInfo.email,
        platform: userInfo.platform,
        loginMethod: userInfo.loginMethod,
        stateMode: parsedState.mode,
      }));

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // ── SSO Allowlist Check ──────────────────────────────────────────────────
      // If the user has an email, verify it's on the Peppr Around SSO allowlist.
      // The check fails open (allows login) if FastAPI is unreachable.
      // Skip allowlist check for "link" mode — user is already authenticated
      if (userInfo.email && parsedState.mode !== "link") {
        const allowlistResult = await checkSsoAllowlist(userInfo.email);
        if (!allowlistResult.allowed) {
          console.warn(`[OAuth] SSO blocked: ${userInfo.email} — ${allowlistResult.reason}`);
          const blockedUrl = `/auth/blocked?reason=${encodeURIComponent(allowlistResult.reason ?? "Not authorized")}&returnTo=${encodeURIComponent(parsedState.returnPath ?? "/")}`;
          res.redirect(302, blockedUrl);
          return;
        }
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // ── Handle "link" mode ──────────────────────────────────────────────────
      // When mode is "link", the user is already logged in and just wants to
      // connect their Google account. We call the SSO bridge to update their
      // sso_provider_id, then redirect back to /settings with a success flag.
      if (parsedState.mode === "link") {
        console.log(`[OAuth] Link mode — linking openId=${userInfo.openId} email=${userInfo.email}`);
        try {
          const backendUrl = overseer.resolve("fastapi");
          const bridgeSecret = process.env.PEPPR_SSO_BRIDGE_SECRET ?? "peppr-sso-bridge-secret-change-in-prod";
          await axios.post(
            `${backendUrl}/v1/auth/sso-login`,
            {
              email: userInfo.email ?? null,
              provider: userInfo.platform ?? "manus",
              provider_id: userInfo.openId,
              full_name: userInfo.name ?? null,
              bridge_secret: bridgeSecret,
            },
            { timeout: 8000 }
          );
          console.log(`[OAuth] Link successful for openId=${userInfo.openId}`);
        } catch (linkError: any) {
          console.warn(`[OAuth] Link SSO bridge call failed: ${linkError?.message}`);
          // Still redirect to settings, but with an error flag
          res.redirect(302, `/settings?linked=error&reason=${encodeURIComponent("Could not link account — no matching Peppr account found")}`);
          return;
        }
        // Redirect back to settings with success flag
        res.redirect(302, `/settings?linked=true`);
        return;
      }

      // ── Peppr Around SSO Bridge (normal login) ──────────────────────────────
      // Exchange the verified Manus identity for Peppr Around JWT tokens.
      // Strategy: try by email first, then fall back to openId (sso_provider_id).
      try {
        const backendUrl = overseer.resolve("fastapi");
        const bridgeSecret = process.env.PEPPR_SSO_BRIDGE_SECRET ?? "peppr-sso-bridge-secret-change-in-prod";
        const ssoResp = await axios.post(
          `${backendUrl}/v1/auth/sso-login`,
          {
            email: userInfo.email ?? null,
            provider: userInfo.platform ?? "manus",
            provider_id: userInfo.openId,
            full_name: userInfo.name ?? null,
            bridge_secret: bridgeSecret,
          },
          { timeout: 8000 }
        );

        if (ssoResp.data?.success && ssoResp.data?.tokens) {
          const { access_token, refresh_token } = ssoResp.data.tokens;
          console.log(`[OAuth] Peppr SSO bridge success for openId=${userInfo.openId} email=${userInfo.email}`);
          // Pass tokens to the frontend via a short-lived redirect
          const params = new URLSearchParams({ access_token, refresh_token });
          res.redirect(302, `/auth/sso-complete?${params.toString()}`);
          return;
        }
      } catch (ssoError: any) {
        const status = ssoError?.response?.status;
        const message = ssoError?.response?.data?.detail ?? ssoError?.message ?? "Unknown error";
        console.warn(`[OAuth] Peppr SSO bridge failed (${status}): ${message}`);

        if (status === 403) {
          // No Peppr account found for this identity
          const emailParam = userInfo.email ? `?email=${encodeURIComponent(userInfo.email)}` : "";
          res.redirect(302, `/auth/sso-no-account${emailParam}`);
          return;
        }
        // Other errors — fall through to plain Manus session
      }

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
