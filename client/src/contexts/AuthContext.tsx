/**
 * Auth Context — manages JWT authentication state.
 *
 * Intent: Provide current user info and auth actions (login, logout) to the entire app.
 * This context does NOT handle routing — that is the layout's responsibility.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import api from "@/lib/api/client";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
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
      const res = await api.post("v1/auth/login", { json: { email, password } }).json<{
        access_token: string;
        user: User;
      }>();
      localStorage.setItem("pa_access_token", res.access_token);
      localStorage.setItem("pa_user", JSON.stringify(res.user));
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("pa_access_token");
    localStorage.removeItem("pa_user");
    setToken(null);
    setUser(null);
  }, []);

  // Verify token on mount
  useEffect(() => {
    if (token && !user) {
      api
        .get("v1/auth/me")
        .json<User>()
        .then((u) => {
          setUser(u);
          localStorage.setItem("pa_user", JSON.stringify(u));
        })
        .catch(() => {
          logout();
        });
    }
  }, [token, user, logout]);

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
