"use client";

import { useEffect, useState } from "react";
import { parseJwt, getClientRoles, KeycloakJWTClaims } from "./auth";

type SSOConfig = {
  clientId: string;
  portalUrl: string;
  keycloakUrl: string;
};

type SSOAuthState = {
  user: KeycloakJWTClaims | null;
  roles: string[];
  isAuthenticated: boolean;
  tokenToCleanFromHash: boolean;
};

function getInitialAuthState(clientId: string): SSOAuthState {
  if (typeof window === "undefined") {
    return { user: null, roles: [], isAuthenticated: false, tokenToCleanFromHash: false };
  }

  let token: string | null = null;
  let tokenToCleanFromHash = false;

  // 1. Capture token from URL hash (#sso_token=eyJhbGci...)
  const hash = window.location.hash;
  if (hash.includes("sso_token=")) {
    const match = hash.match(/sso_token=([^&]*)/);
    if (match && match[1]) {
      token = match[1];
      localStorage.setItem("sso_access_token", token);
      localStorage.setItem("token", token);
      tokenToCleanFromHash = true;
    }
  }

  // 2. Fallback to localStorage token
  if (!token) {
    token = localStorage.getItem("sso_access_token") || localStorage.getItem("token");
  }

  if (token) {
    const parsed = parseJwt(token);
    if (parsed) {
      const extractedRoles = getClientRoles(parsed, clientId);
      return {
        user: parsed,
        roles: extractedRoles,
        isAuthenticated: true,
        tokenToCleanFromHash,
      };
    } else {
      localStorage.removeItem("sso_access_token");
      localStorage.removeItem("token");
    }
  }

  return { user: null, roles: [], isAuthenticated: false, tokenToCleanFromHash: false };
}

export function useSSOAuth(config: SSOConfig) {
  // Synchronously compute state on initialization — NO setState inside effect body
  const [authState, setAuthState] = useState<SSOAuthState>(() =>
    getInitialAuthState(config.clientId)
  );

  // Effect strictly handles external side effect: cleaning URL hash
  useEffect(() => {
    if (authState.tokenToCleanFromHash && typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [authState.tokenToCleanFromHash]);

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sso_access_token");
      localStorage.removeItem("token");
      window.location.href = config.portalUrl;
    }
  };

  return {
    user: authState.user,
    roles: authState.roles,
    isAuthenticated: authState.isAuthenticated,
    isLoading: false,
    logout,
  };
}