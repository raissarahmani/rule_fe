"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { OIDCUser } from "@/lib/server/oidc";

export type UserProfile = OIDCUser;
type AuthContextType = {
  user: UserProfile | null; userDomain: string; role: string; roles: string[];
  isLoggedIn: boolean; loading: boolean; rawJwt: null;
  logout: () => void; redirectToPortal: () => void;
};

function login() { window.location.assign(new URL("/rule/login", window.location.origin).href); }
function logout() {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/rule/logout";
  document.body.appendChild(form);
  form.submit();
}

const AuthContext = createContext<AuthContextType>({
  user: null, userDomain: "", role: "", roles: [], isLoggedIn: false,
  loading: true, rawJwt: null, logout, redirectToPortal: login,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // Retire tokens stored by the previous browser-only SSO implementation.
    localStorage.removeItem("sso_access_token");
    localStorage.removeItem("token");
    const controller = new AbortController();
    let inFlight = false;
    const refresh = () => {
      if (inFlight) return;
      inFlight = true;
      return fetch("/rule/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) { if (!controller.signal.aborted) setUser(null); return; }
        const body = await response.json();
        if (!controller.signal.aborted) setUser(body.user);
      })
      .catch(() => { if (!controller.signal.aborted) setUser(null); })
      .finally(() => { inFlight = false; if (!controller.signal.aborted) setLoading(false); });
    };
    void refresh();
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, []);
  return (
    <AuthContext.Provider value={{
      user, userDomain: user?.username || "", role: user?.primaryRole || "", roles: user?.roles || [],
      isLoggedIn: Boolean(user), loading, rawJwt: null, logout, redirectToPortal: login,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
