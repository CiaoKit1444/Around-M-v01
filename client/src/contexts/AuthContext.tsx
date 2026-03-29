/**
 * Auth Context — manages authentication state for the Peppr admin app.
 *
 * Dual-auth bridge:
 *   PRIMARY  — Manus OAuth (cookie-based). On mount, if no pa_access_token exists
 *              in localStorage, we call trpc.auth.pepprProfile to look up the
 *              Peppr user record linked to the active Manus session. This ensures
 *              all hooks that depend on AuthContext work correctly on bo.peppr.vip
 *              even when the user has never gone through the legacy JWT login flow.
 *
 *   FALLBACK — Peppr JWT (localStorage). Used when the user logs in via the
 *              traditional email/password form. Tokens are stored as pa_access_token
 *              and pa_refresh_token in localStorage. SsoCompletePage also populates
 *              these after the Manus OAuth callback completes.
 *
 * Auth flow (Manus OAuth, primary):
 *   1. User visits any /admin/* URL
 *   2. AdminGuard checks trpc.auth.me (cookie) → authenticated
 *   3. AuthContext.AuthProvider mounts, no pa_access_token found
 *   4. Calls trpc.auth.pepprProfile → returns Peppr user profile
 *   5. Populates user state + localStorage pa_user so all hooks work
 *
 * Auth flow (Peppr JWT, fallback):
 *   1. User submits email + password on LoginPage
 *   2. POST /api/v1/auth/login → { tokens, user }
 *   3. Tokens stored in localStorage, user set in state
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import api from "@/lib/api/client";
import { trpc } from "@/lib/trpc";

/** Matches Peppr UserProfile schema */
interface UserProfile {
  user_id: string;
  email: string;
  full_name: string;
  mobile?: string | null;
  role?: string | null;
  partner_id?: string | null;
  property_id?: string | null;
  email_verified?: boolean;
  status?: string;
  twofa_enabled?: boolean;
  roles?: string[];
  last_login_at?: string | null;
  created_at?: string | null;
}

/** Matches Peppr TokenResponse schema */
interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in: number;
}

/** Matches Peppr LoginResponse schema */
interface LoginApiResponse {
  success: boolean;
  tokens?: TokenResponse;
  user?: UserProfile;
  requires_2fa?: boolean;
  challenge_token?: string;
}

/** Thrown by login() when the server requires a 2FA code */
export class TwoFARequiredError extends Error {
  challengeToken: string;
  constructor(challengeToken: string) {
    super("2FA_REQUIRED");
    this.name = "TwoFARequiredError";
    this.challengeToken = challengeToken;
  }
}

/** Flattened user for the rest of the app */
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  status: string;
  partner_id?: string | null;
  property_id?: string | null;
}

function profileToUser(p: UserProfile): User {
  const parts = (p.full_name || "").split(" ");
  return {
    id: p.user_id,
    email: p.email,
    first_name: parts[0] || "",
    last_name: parts.slice(1).join(" ") || "",
    full_name: p.full_name,
    role: p.role || (p.roles && p.roles[0]) || "user",
    status: p.status || "ACTIVE",
    partner_id: p.partner_id,
    property_id: p.property_id,
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  verify2fa: (challengeToken: string, code: string) => Promise<void>;
  logout: () => void;
}

type AuthContextType = AuthState & AuthActions;

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Inner provider that has access to tRPC hooks.
 * Separated from AuthProvider so tRPC context is available.
 */
function AuthProviderInner({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("pa_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("pa_access_token")
  );
  // Start loading=true only when we have no stored user yet — prevents
  // AdminGuard from flashing the spinner on every render for logged-in users.
  const [isLoading, setIsLoading] = useState(() => !localStorage.getItem("pa_user"));

  const isAuthenticated = !!user;

  // ── Manus OAuth bridge ────────────────────────────────────────────────────
  // If there's no pa_access_token, try to hydrate the user from the active
  // Manus OAuth session via the pepprProfile tRPC procedure.
  const skipBridge = !!localStorage.getItem("pa_access_token");
  const pepprProfileQuery = trpc.auth.pepprProfile.useQuery(undefined, {
    enabled: !skipBridge,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (skipBridge) {
      setIsLoading(false);
      return;
    }
    if (pepprProfileQuery.isLoading) return;

    if (pepprProfileQuery.data) {
      const appUser = profileToUser(pepprProfileQuery.data as UserProfile);
      setUser(appUser);
      // Persist so subsequent renders skip the bridge query
      localStorage.setItem("pa_user", JSON.stringify(appUser));
    }
    setIsLoading(false);
  }, [pepprProfileQuery.isLoading, pepprProfileQuery.data, skipBridge]);

  // ── Peppr JWT verification on mount ──────────────────────────────────────
  // If we have a stored token, verify it's still valid.
  useEffect(() => {
    if (!token) return;
    api
      .get("v1/auth/me")
      .json<UserProfile>()
      .then((profile) => {
        const appUser = profileToUser(profile);
        setUser(appUser);
        localStorage.setItem("pa_user", JSON.stringify(appUser));
      })
      .catch(() => {
        // Token expired or invalid — clear but don't redirect
        console.warn("[Auth] Token verification failed, clearing stored auth");
        localStorage.removeItem("pa_access_token");
        localStorage.removeItem("pa_refresh_token");
        localStorage.removeItem("pa_user");
        setToken(null);
        setUser(null);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api
        .post("v1/auth/login", {
          json: {
            email,
            password,
            user_agent: navigator.userAgent,
          },
        })
        .json<LoginApiResponse>();

      // 2FA challenge — server requires TOTP before issuing tokens
      if (res.requires_2fa && res.challenge_token) {
        throw new TwoFARequiredError(res.challenge_token);
      }

      if (!res.success || !res.tokens || !res.user) {
        throw new Error("Login failed");
      }

      const { tokens, user: profile } = res as Required<LoginApiResponse>;

      localStorage.setItem("pa_access_token", tokens.access_token);
      localStorage.setItem("pa_refresh_token", tokens.refresh_token);

      const appUser = profileToUser(profile);
      localStorage.setItem("pa_user", JSON.stringify(appUser));

      setToken(tokens.access_token);
      setUser(appUser);
    } catch (err: any) {
      // Re-throw 2FA challenge errors directly — LoginPage handles them
      if (err instanceof TwoFARequiredError) throw err;
      let message = "Invalid credentials. Please try again.";
      try {
        if (err?.response) {
          const body = await err.response.json();
          message = body?.error?.message || body?.detail || message;
        }
      } catch {
        // ignore parse errors
      }
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verify2fa = useCallback(async (challengeToken: string, code: string) => {
    setIsLoading(true);
    try {
      const res = await api
        .post("v1/auth/verify-2fa", {
          json: { challenge_token: challengeToken, code },
        })
        .json<LoginApiResponse>();

      if (!res.success || !res.tokens || !res.user) {
        throw new Error("2FA verification failed");
      }

      const { tokens, user: profile } = res as Required<LoginApiResponse>;
      localStorage.setItem("pa_access_token", tokens.access_token);
      localStorage.setItem("pa_refresh_token", tokens.refresh_token);
      const appUser = profileToUser(profile);
      localStorage.setItem("pa_user", JSON.stringify(appUser));
      setToken(tokens.access_token);
      setUser(appUser);
    } catch (err: any) {
      let message = "Invalid code. Please try again.";
      try {
        if (err?.response) {
          const body = await err.response.json();
          message = body?.error?.message || body?.detail || message;
        }
      } catch { /* ignore */ }
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("pa_access_token");
    localStorage.removeItem("pa_refresh_token");
    localStorage.removeItem("pa_user");
    setToken(null);
    setUser(null);
  }, []);

  // Listen for pa:logout event dispatched by the API client when token refresh fails
  useEffect(() => {
    const handleForceLogout = () => {
      console.warn("[Auth] Token refresh failed — forcing logout");
      logout();
    };
    window.addEventListener("pa:logout", handleForceLogout);
    return () => window.removeEventListener("pa:logout", handleForceLogout);
  }, [logout]);

  const value = useMemo(
    () => ({ user, token, isAuthenticated, isLoading, login, verify2fa, logout }),
    [user, token, isAuthenticated, isLoading, login, verify2fa, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthProviderInner>{children}</AuthProviderInner>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
