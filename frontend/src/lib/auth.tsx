"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { api, setToken, getToken } from "./api";
import type { User, Company } from "./types";

interface AuthState {
  user: User | null;
  company: Company | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

interface RegisterData {
  companyName: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setCompany(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api<{ user: User; company: Company }>("/auth/me");
      setUser(res.user);
      setCompany(res.company);
    } catch {
      setToken(null);
      setUser(null);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(res.token);
    await loadMe();
  };

  const register = async (data: RegisterData) => {
    const res = await api<{ token: string; user: User; company: Company }>("/auth/register", {
      method: "POST",
      body: data,
    });
    setToken(res.token);
    setUser(res.user);
    setCompany(res.company);
    setLoading(false);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setCompany(null);
  };

  return (
    <AuthContext.Provider value={{ user, company, loading, login, register, logout, refresh: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
