"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  /** Our custom HMAC-SHA256 JWT — used in Authorization: Bearer headers throughout the app */
  idToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "creditai_auth";

function saveUser(user: User) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function loadUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

function clearUser() {
  localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount — verify stored token is still valid
  useEffect(() => {
    async function restoreSession() {
      const stored = loadUser();
      if (!stored?.idToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${stored.idToken}` },
        });
        if (!res.ok) {
          clearUser();
          setLoading(false);
          return;
        }
        const data = await res.json() as { uid: string; email: string; token: string };
        // Use possibly-refreshed token
        const refreshed: User = {
          uid: data.uid,
          email: data.email,
          displayName: stored.displayName,
          idToken: data.token,
          refreshToken: "",
        };
        saveUser(refreshed);
        setUser(refreshed);
      } catch {
        clearUser();
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      const code = data.error || "Sign in failed";
      if (code === "INVALID_LOGIN_CREDENTIALS") throw new Error("INVALID_LOGIN_CREDENTIALS");
      throw new Error(code);
    }

    const data = await res.json() as { uid: string; email: string; token: string };
    const newUser: User = {
      uid: data.uid,
      email: data.email,
      displayName: null,
      idToken: data.token,
      refreshToken: "",
    };
    saveUser(newUser);
    setUser(newUser);
  };

  const signUp = async (email: string, password: string): Promise<User> => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      const code = data.error || "Sign up failed";
      if (code === "EMAIL_EXISTS") throw new Error("EMAIL_EXISTS");
      if (code === "WEAK_PASSWORD") throw new Error("WEAK_PASSWORD : Password should be at least 6 characters");
      throw new Error(code);
    }

    const data = await res.json() as { uid: string; email: string; token: string };
    const newUser: User = {
      uid: data.uid,
      email: data.email,
      displayName: null,
      idToken: data.token,
      refreshToken: "",
    };
    saveUser(newUser);
    setUser(newUser);
    return newUser;
  };

  const signInWithGoogle = async () => {
    throw new Error("Google sign-in is not supported. Please use email and password.");
  };

  const signOut = async () => {
    clearUser();
    setUser(null);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      loading: true,
      signIn: async () => {},
      signUp: async () => { throw new Error("Auth not initialized"); },
      signInWithGoogle: async () => {},
      signOut: async () => {},
    };
  }
  return context;
}
