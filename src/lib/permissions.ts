// Names match the RMT-RU menu registration; database IDs are not stable keys.
export const ruleMenus = {
  home: "Home", limit: "Limit", underlying: "Underlying", rate: "Rate",
  approvals: "Daftar Otorisasi Data", history: "Riwayat Otorisasi", activity: "Log Activity",
} as const;
export type RuleMenu = keyof typeof ruleMenus;
export type RuleAccess = { level: string; menus: RuleMenu[]; profile?: string | string[] };

export function hasProfile(user: RuleAccess | null | undefined, name: string): boolean {
  if (!user?.profile) return false;
  const target = name.toUpperCase();
  if (Array.isArray(user.profile)) {
    return user.profile.some(p => typeof p === "string" && p.trim().toUpperCase() === target);
  }
  if (typeof user.profile === "string") {
    return user.profile.trim().toUpperCase() === target;
  }
  return false;
}

export function canView(user: RuleAccess | null | undefined, menu: RuleMenu) {
  return Boolean(user?.menus.includes(menu));
}

export function canEdit(user: RuleAccess | null | undefined, menu: "limit" | "rate" | "underlying") {
  const level = String(user?.level);
  
  // RMT-Treasuri Level 1 can edit limit and rate only
  if (hasProfile(user, "rmt-treasuri")) {
    return level === "1" && (menu === "limit" || menu === "rate");
  }

  // RMT-DSO cannot edit limit and rate (or underlying as per general policy)
  return false;
}

export function canApprove(user: RuleAccess | null | undefined, menu: "limit" | "rate" | "underlying") {
  const level = String(user?.level);

  if (menu === "underlying") {
    // Both Level 1 and Level 2 of RMT-DSO can approve underlying
    return (level === "1" || level === "2") && hasProfile(user, "rmt-dso");
  }

  if (menu === "limit" || menu === "rate") {
    // Only RMT-Treasuri Level 2 can approve limit and rate
    return level === "2" && hasProfile(user, "rmt-treasuri");
  }

  return false;
}

export function routeMenu(pathname: string): RuleMenu | undefined {
  const path = pathname.replace(/^\/rule(?=\/|$)/, "").replace(/\/$/, "");
  if (path === "/home") return "home";
  for (const [prefix, menu] of [
    ["/home/limit", "limit"], ["/home/rate", "rate"], ["/home/underly", "underlying"],
    ["/otorisasi/list", "approvals"], ["/otorisasi/history", "history"], ["/log-activity", "activity"],
  ] as const) if (path === prefix || path.startsWith(prefix + "/")) return menu;
}

export function canAccessRoute(user: RuleAccess | null | undefined, pathname: string) {
  const path = pathname.replace(/^\/rule(?=\/|$)/, "").replace(/\/$/, "");
  if (path === "/otorisasi") {
    return canView(user, "approvals") || canView(user, "history");
  }
  const menu = routeMenu(pathname);
  return menu !== undefined && canView(user, menu);
}

export function canAccessApi(user: RuleAccess, method: string, path: string[], query: URLSearchParams) {
  const endpoint = path.join("/");
  const reading = method === "GET" || method === "HEAD";
  const resource = path[0] === "limits" ? "limit" : path[0] === "margins" ? "rate" : path[0] === "underly-docs" ? "underlying" : undefined;
  if (!reading) {
    if (method !== "PUT" || !resource) return false;
    if (endpoint === `${path[0]}/status`) return canApprove(user, resource);
    return resource !== "underlying" && endpoint === path[0] && canEdit(user, resource);
  }
  if (endpoint === "log") return canView(user, "activity");
  if (!resource) return false;
  if (/^(limits|margins)\/history(?:\/[^/]+)?$/.test(endpoint)) {
    // Pending proposals and their details are read by the approval screen too.
    const type = query.get("type");
    if (query.getAll("type").length > 1) return false;
    if (path.length === 2 && type !== "Approve" && type !== "Reject") {
      return (type === "Create" || type === "Update") && canApprove(user, resource);
    }
    return canView(user, resource) || canView(user, "history");
  }
  const known = /^(limits|margins\/final-rates\/(all|export)|underly-docs(?:\/(history|stat|[^/]+)(?:\/(duplicate|export|preview))?)?)$/.test(endpoint);
  return known && canView(user, resource);
}
