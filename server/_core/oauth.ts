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

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // ── SSO Allowlist Check ──────────────────────────────────────────────────
      // If the user has an email, verify it's on the Peppr Around SSO allowlist.
      // The check fails open (allows login) if FastAPI is unreachable.
      if (userInfo.email) {
        const allowlistResult = await checkSsoAllowlist(userInfo.email);
        if (!allowlistResult.allowed) {
          console.warn(`[OAuth] SSO blocked: ${userInfo.email} — ${allowlistResult.reason}`);
          // Parse the state to extract origin and returnPath for the redirect
          let origin = "";
          let returnUrl = "/";
          try {
            const parsedState = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
            origin = parsedState.origin ?? "";
            returnUrl = parsedState.returnPath ?? "/";
          } catch {
            // state is not base64 JSON — use defaults
          }
          const blockedUrl = `${origin}/auth/blocked?reason=${encodeURIComponent(allowlistResult.reason ?? "Not authorized")}&returnTo=${encodeURIComponent(returnUrl)}`;
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

      // ── Peppr Around SSO Bridge ──────────────────────────────────────────────
      // If the user has an email, exchange the verified identity for Peppr JWT tokens.
      // On success, redirect to /auth/sso-complete with tokens in query params.
      // On failure (no Peppr account), redirect to /auth/sso-no-account.
      if (userInfo.email) {
        try {
          const backendUrl = overseer.resolve("fastapi");
          const bridgeSecret = process.env.PEPPR_SSO_BRIDGE_SECRET ?? "peppr-sso-bridge-secret-change-in-prod";
          const ssoResp = await axios.post(
            `${backendUrl}/v1/auth/sso-login`,
            {
              email: userInfo.email,
              provider: userInfo.platform ?? "google",
              provider_id: userInfo.openId,
              full_name: userInfo.name ?? null,
              bridge_secret: bridgeSecret,
            },
            { timeout: 8000 }
          );

          if (ssoResp.data?.success && ssoResp.data?.tokens) {
            const { access_token, refresh_token } = ssoResp.data.tokens;
            // Pass tokens to the frontend via a short-lived redirect
            // The /auth/sso-complete page reads them from query params, stores in localStorage, then redirects to /role-switch
            const params = new URLSearchParams({
              access_token,
              refresh_token,
            });
            res.redirect(302, `/auth/sso-complete?${params.toString()}`);
            return;
          }
        } catch (ssoError: any) {
          const status = ssoError?.response?.status;
          const message = ssoError?.response?.data?.detail ?? ssoError?.message ?? "Unknown error";
          console.warn(`[OAuth] Peppr SSO bridge failed (${status}): ${message}`);

          if (status === 403) {
            // No Peppr account for this email
            res.redirect(302, `/auth/sso-no-account?email=${encodeURIComponent(userInfo.email)}`);
            return;
          }
          // Other errors — fall through to plain Manus session (dashboard will show demo data)
        }
      }

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
