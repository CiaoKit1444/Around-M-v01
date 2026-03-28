export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// ---------------------------------------------------------------------------
// Logo URLs — single source of truth for all logo references in the app.
// LOGO_WHITE : white variant — use on dark backgrounds (sidebar, dark headers)
// LOGO_BLACK : black/colour variant — use on light backgrounds (auth pages, guest header)
// ---------------------------------------------------------------------------
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663252506440/jKkhr27mS3Co8cU4bKqLWb";
export const LOGO_WHITE_URL = `${CDN}/peppr-logo-white_60dd5e67.svg`;
export const LOGO_BLACK_URL = `${CDN}/peppr-logo_3633e33d.svg`;

// Generate login URL at runtime so redirect URI reflects the current origin.
// Pass an optional returnPath (e.g. "/admin/rooms/:id") to be restored after login.
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  // Encode both the redirectUri and the returnPath into state so the OAuth
  // callback can forward the user to the right page after login.
  const statePayload = returnPath
    ? btoa(JSON.stringify({ redirectUri, returnPath }))
    : btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", statePayload);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
