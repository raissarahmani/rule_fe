export interface Menu {
  id: number;
  parent_id: number | null;
  code: string;
  menu: string;
  role: number;
  children?: Menu[];
}

export interface Modul {
  id: number;
  modul: string;
  modul_code: string;
  modul_desc: string;
  url: string;
  profile: string;
  role: number;
  menus: Menu[] | null;
}

export interface DynamicMenuItem {
  title: string;
  url?: string;
  icon?: any;
  items?: { title: string; url: string }[];
}

export interface KeycloakJWTClaims {
  sub: string;
  preferred_username: string;
  name: string;
  email?: string;
  branch?: string;
  level?: string;
  groups?: string[];
  roles?: string[];
  resource_access?: Record<string, { roles: string[] }>;
}

export function parseJwt(token: string): KeycloakJWTClaims | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error("[SSO] Failed to parse JWT:", err);
    return null;
  }
}

export function getClientRoles(claims: KeycloakJWTClaims, clientId: string): string[] {
  const roles: string[] = [];

  // Extract from resource_access.<clientId>.roles
  if (claims.resource_access && claims.resource_access[clientId]?.roles) {
    roles.push(...claims.resource_access[clientId].roles);
  }

  // Extract general realm roles if present
  if (Array.isArray(claims.roles)) {
    roles.push(...claims.roles);
  }

  return roles;
}