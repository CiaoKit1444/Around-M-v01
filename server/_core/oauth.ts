import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import axios from "axios";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

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

      // ── SSO Bridge: call the Express-native /api/v1/auth/sso-login ──────────
      // This endpoint is registered by pepprAuth.ts and runs in-process.
      // Works in both dev and production.
      // SECURITY: SSO_BRIDGE_SECRET must be set — validated at startup by pepprAuth.ts.
      // We assert here as a belt-and-suspenders guard for this call site.
      const bridgeSecret = process.env.SSO_BRIDGE_SECRET;
      if (!bridgeSecret) {
        console.error("[OAuth] SSO_BRIDGE_SECRET is not set — cannot complete SSO login");
        res.redirect(`${parsedState.origin || ""}/login?error=config`);
        return;
      }
      const ssoPayload = {
        email: userInfo.email ?? null,
        provider: userInfo.platform ?? "manus",
        provider_id: userInfo.openId,
        open_id: userInfo.openId,
        full_name: userInfo.name ?? null,
        bridge_secret: bridgeSecret,
      };

      // ── Handle "link" mode ──────────────────────────────────────────────────
      if (parsedState.mode === "link") {
        console.log(`[OAuth] Link mode — linking openId=${userInfo.openId} email=${userInfo.email}`);
        try {
          // Call our own Express endpoint via localhost
          const port = process.env.PORT || "3000";
          await axios.post(
            `http://localhost:${port}/api/v1/auth/sso-login`,
            ssoPayload,
            { timeout: 8000 }
          );
          console.log(`[OAuth] Link successful for openId=${userInfo.openId}`);
          res.redirect(302, `/settings?linked=true`);
        } catch (linkError: any) {
          console.warn(`[OAuth] Link SSO bridge call failed: ${linkError?.message}`);
          res.redirect(302, `/settings?linked=error&reason=${encodeURIComponent("Could not link account — no matching Peppr account found")}`);
        }
        return;
      }

      // ── Normal SSO login ────────────────────────────────────────────────────
      try {
        const port = process.env.PORT || "3000";
        const ssoResp = await axios.post(
          `http://localhost:${port}/api/v1/auth/sso-login`,
          ssoPayload,
          { timeout: 8000 }
        );

        if (ssoResp.data?.success && ssoResp.data?.tokens) {
          const { access_token, refresh_token } = ssoResp.data.tokens;
          console.log(`[OAuth] Peppr SSO bridge success for openId=${userInfo.openId} email=${userInfo.email}`);
          const params = new URLSearchParams({ access_token, refresh_token });
          // Preserve the returnPath so the user lands on the right page after login
          if (parsedState.returnPath && parsedState.returnPath !== "/") {
            params.set("returnPath", parsedState.returnPath);
          }
          res.redirect(302, `/admin/sso-complete?${params.toString()}`);
          return;
        }
      } catch (ssoError: any) {
        const status = ssoError?.response?.status;
        const message = ssoError?.response?.data?.detail ?? ssoError?.message ?? "Unknown error";
        console.warn(`[OAuth] Peppr SSO bridge failed (${status}): ${message}`);

        if (status === 404) {
          // No Peppr account found for this identity
          const emailParam = userInfo.email ? `?email=${encodeURIComponent(userInfo.email)}` : "";
          res.redirect(302, `/admin/sso-no-account${emailParam}`);
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
