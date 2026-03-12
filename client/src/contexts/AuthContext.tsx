/**
 * Auth Context — manages JWT authentication state against the FastAPI backend.
 *
 * Intent: Provide current user info and auth actions (login, logout) to the entire app.
 * This context does NOT handle routing — that is the layout's responsibility.
 *
 * Auth flow:
 *   1. User submits email + password on LoginPage
 *   2. POST /api/v1/auth/login → { tokens: { access_token, refresh_token }, user: UserProfile }
 *   3. Tokens stored in localStorage, attached to all subsequent API calls via ky beforeRequest hook
 *   4. On mount, if token exists, verify with GET /api/v1/auth/me
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import api from "@/lib/api/client";

/** Matches FastAPI UserProfile schema */
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

/** Matches FastAPI TokenResponse schema */
interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in: number;
}

/** Matches FastAPI LoginResponse schema */
interface LoginApiResponse {
  success: boolean;
  tokens: TokenResponse;
  user: UserProfile;
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
  logout: () => void;
}

type AuthContextType = AuthState & AuthActions;

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("pa_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("pa_access_token"));
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = !!token && !!user;

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

      if (!res.success && !(res.tokens && res.user)) {
        throw new Error("Login failed");
      }

      const { tokens, user: profile } = res;

      // Store tokens
      localStorage.setItem("pa_access_token", tokens.access_token);
      localStorage.setItem("pa_refresh_token", tokens.refresh_token);

      // Convert profile to app user
      const appUser = profileToUser(profile);
      localStorage.setItem("pa_user", JSON.stringify(appUser));

      setToken(tokens.access_token);
      setUser(appUser);
    } catch (err: any) {
      // Try to extract error message from FastAPI error response
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

  const logout = useCallback(() => {
    localStorage.removeItem("pa_access_token");
    localStorage.removeItem("pa_refresh_token");
    localStorage.removeItem("pa_user");
    setToken(null);
    setUser(null);
  }, []);

  // Verify token on mount — if we have a token, check it's still valid
  useEffect(() => {
    if (token) {
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
          // The demo fallback system will handle showing data
          console.warn("[Auth] Token verification failed, clearing stored auth");
          logout();
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(
    () => ({ user, token, isAuthenticated, isLoading, login, logout }),
    [user, token, isAuthenticated, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
