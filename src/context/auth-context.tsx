"use client";

import React, { createContext, useContext, useCallback } from "react";
import { useSSOAuth } from "@/lib/sso/useSSOauth";
import { KeycloakJWTClaims } from "@/lib/sso/auth";

export type UserProfile = {
  id: string;
  username: string;
  name: string;
  email: string;
  branch: string;
  level: string;
  groups: string[];
  roles: string[];
  primaryRole: string;
};

type AuthContextType = {
  user: UserProfile | null;
  userDomain: string;
  role: string;
  roles: string[];
  isLoggedIn: boolean;
  loading: boolean;
  rawJwt: KeycloakJWTClaims | null;
  logout: () => void;
  redirectToPortal: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  userDomain: "",
  role: "",
  roles: [],
  isLoggedIn: false,
  loading: false,
  rawJwt: null,
  logout: () => {},
  redirectToPortal: () => {},
});

const SSO_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_MODULE_CLIENT_ID || "rule-treasury",
  portalUrl: process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3000",
  keycloakUrl: process.env.NEXT_PUBLIC_KEYCLOAK_URL || "http://localhost:8080",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: ssoUser, roles: ssoRoles, isAuthenticated, isLoading, logout: ssoLogout } = useSSOAuth(SSO_CONFIG);

  const redirectToPortal = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.href = SSO_CONFIG.portalUrl;
    }
  }, []);

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sso_access_token");
      localStorage.removeItem("token");
    }
    if (ssoLogout) {
      ssoLogout();
    } else {
      redirectToPortal();
    }
  };

  // Derive User Profile directly from Keycloak JWT claims
  const userProfile: UserProfile | null = ssoUser
    ? {
        id: ssoUser.sub || "",
        username: ssoUser.preferred_username || "",
        name: ssoUser.name || "",
        email: ssoUser.email || "",
        branch: ssoUser.branch || "",
        level: ssoUser.level || "",
        groups: Array.isArray(ssoUser.groups) ? ssoUser.groups : [],
        roles: ssoRoles,
        primaryRole: ssoRoles[0] || "",
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user: userProfile,
        userDomain: userProfile?.username || "",
        role: userProfile?.primaryRole || "",
        roles: ssoRoles,
        isLoggedIn: isAuthenticated,
        loading: isLoading,
        rawJwt: ssoUser,
        logout,
        redirectToPortal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);