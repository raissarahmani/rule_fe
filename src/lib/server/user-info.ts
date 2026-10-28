import "server-only";
import { ruleMenus, type RuleMenu } from "@/lib/permissions";

export class AuthenticationError extends Error {
  constructor(public status: 401 | 403 | 502 | 503, message: string, public menuSchema?: string) { super(message); }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

export function normalizeProfiles(value: unknown): string[] {
  if (typeof value === "string") {
    const text = value.trim();
    try { value = JSON.parse(text); } catch { value = text.startsWith("[") && text.endsWith("]") ? text.slice(1, -1).split(",") : [text]; }
  }
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string")
    .map(item => item.trim().toUpperCase()).filter(item => /^[A-Z0-9_-]+$/.test(item)))];
}

function eligible(row: Record<string, unknown>, profiles: string[], level: number, inheritModuleProfile = false) {
  if (row.has_access !== undefined && row.has_access !== true) return false;
  const role = row.role ?? row.Role;
  const profile = row.profile ?? row.Profile;
  const hasProfile = Object.hasOwn(row, "profile") || Object.hasOwn(row, "Profile");
  // A prefiltered grant may omit raw database restrictions, but must explicitly allow access.
  if (role === undefined && !hasProfile) return row.has_access === true;
  // The provider omits menu profile restrictions; inherit only after validating the module.
  const permitted = !hasProfile && inheritModuleProfile ? ["ALL"] : normalizeProfiles(profile);
  return [level, String(level), 99, "99"].includes(role as string | number) &&
    (permitted.includes("ALL") || profiles.some(code => permitted.includes(code)));
}

export function userInfoProfile(value: unknown, subject: string, username?: string) {
  const response = record(value);
  const data = response && (Object.hasOwn(response, "data")
    ? response.status === "success" ? record(response.data) : undefined : response);
  if (!data) throw new AuthenticationError(502, "Invalid UserInfo response");
  if (data.sub !== undefined ? data.sub !== subject : !username || data.username !== username) {
    throw new AuthenticationError(401, "UserInfo identity does not match the verified access token");
  }
  const active = (flag: unknown) => flag === 1 || flag === "1";
  const level = data.level === 1 || data.level === "1" ? 1 : data.level === 2 || data.level === "2" ? 2 : undefined;
  const profiles = normalizeProfiles(data.profile);
  if (Object.hasOwn(data, "Modul") && Object.hasOwn(data, "modul")) {
    throw new AuthenticationError(502, "UserInfo contains ambiguous Modul and modul claims");
  }
  const moduleClaim = data.Modul ?? data.modul;
  const modules = Array.isArray(moduleClaim) ? moduleClaim.map(record).filter(row => row !== undefined) : [];
  const matches = modules.filter(row => (row.modul_code ?? row.Modul_Code) === "RMT-RU");
  const grant = matches.length === 1 ? matches[0] : undefined;
  if (!active(data.status)) throw new AuthenticationError(403, "UserInfo status is missing or inactive");
  if (!active(data.isAktif)) throw new AuthenticationError(403, "UserInfo isAktif is missing or inactive");
  if (!level) throw new AuthenticationError(403, "UserInfo level must be 1 or 2");
  if (!profiles.length) throw new AuthenticationError(403, "UserInfo profile is missing or invalid");
  if (!grant) throw new AuthenticationError(403, "UserInfo must contain exactly one RMT-RU module");
  if (grant.has_access !== true) throw new AuthenticationError(403, "UserInfo RMT-RU has_access is not true");
  if (!eligible(grant, profiles, level)) throw new AuthenticationError(403, "UserInfo RMT-RU profile or role does not match the account");
  const menus = new Set<RuleMenu>();
  const collect = (rows: unknown, depth = 0) => {
    if (!Array.isArray(rows) || depth > 4) return;
    for (const value of rows) {
      const row = record(value);
      if (!row || ((row.modul_code ?? row.Modul_Code) !== undefined && (row.modul_code ?? row.Modul_Code) !== "RMT-RU") || !eligible(row, profiles, level, true)) continue;
      const name = row.menu ?? row.menu_name ?? row.Menu;
      for (const [key, label] of Object.entries(ruleMenus)) {
        if (typeof name === "string" && name.trim().toLowerCase() === label.toLowerCase()) {
          // Registration reserves approval and activity menus for supervisors.
          if ((key === "approvals" || key === "activity") && level !== 2) continue;
          menus.add(key as RuleMenu);
        }
      }
      collect(row.menus, depth + 1);
    }
  };
  collect(grant.menus);
  if (!menus.size) {
    // Schema only: inspect provider field names/types without logging user or permission values.
    const fieldTypes = (row: Record<string, unknown>) => Object.fromEntries(
      Object.entries(row).slice(0, 40).filter(([key]) => /^[A-Za-z0-9_-]{1,64}$/.test(key)).map(([key, value]) => [key,
        Array.isArray(value) ? { type: "array", count: value.length, firstItemFields: Object.keys(record(value[0]) || {}).filter(key => /^[A-Za-z0-9_-]{1,64}$/.test(key)).slice(0, 40) }
          : value === null ? "null" : typeof value,
      ]),
    );
    const menuSchema = JSON.stringify({
      userInfoFields: fieldTypes(data), moduleFields: fieldTypes(grant),
      menuSamples: Array.isArray(grant.menus) ? grant.menus.slice(0, 3).map(value => fieldTypes(record(value) || {})) : [],
    });
    throw new AuthenticationError(403, "No recognized RMT-RU menu grants", menuSchema);
  }
  const text = (key: string) => typeof data[key] === "string" ? data[key] as string : "";
  return {
    id: subject, username: text("preferred_username") || text("username") || username || "",
    name: text("name"), email: text("email"), branch: typeof data.branch === "number" ? String(data.branch) : text("branch"),
    level: String(level), profile: profiles, groups: Array.isArray(data.groups) ? data.groups.filter((item): item is string => typeof item === "string") : [],
    menus: [...menus],
  };
}
