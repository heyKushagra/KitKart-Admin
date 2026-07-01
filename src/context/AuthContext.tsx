// AuthContext — manages the logged-in admin user and persists the session.
// Wrap the app in <AuthProvider> and use the useAuth() hook in any component.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi } from "../lib/api";

interface AuthUser {
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean; // true while a login request is in flight
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const SESSION_KEY = "kitkart_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);

  // Restore an existing session on first load.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const user = await authApi.login(email, password);
      setUser(user);
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Convenience hook so consumers don't have to handle the undefined case.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
