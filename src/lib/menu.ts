import {
  HouseIcon,
  Settings2Icon,
  FileTextIcon,
  BanknoteIcon,
  StampIcon,
  ChartNoAxesColumnIcon
} from "lucide-react"

export type MenuItem = {
  title: string;
  url: string;
  icon?: React.ElementType;
  items?: SubMenuItem[];
};

export interface SubMenuItem {
  title: string;
  url: string;
  icon?: React.ElementType;
}

export const menuItems: Record<number, MenuItem> = {
  1: {
    title: "Home",
    url: "/home",
    icon: HouseIcon,
  },
  2: {
    title: "Limit",
    url: "/home/limit",
    icon: Settings2Icon,
  },
  3: {
    title: "Underlying",
    url: "/home/underly",
    icon: FileTextIcon,
  },
  4: {
    title: "Rate",
    url: "/home/rate",
    icon: BanknoteIcon,
  },
  5: {
    title: "Otorisasi",
    url: "/otorisasi",
    icon: StampIcon,
    items: [
      {
        title: "Daftar Otorisasi Data",
        url: "/otorisasi/list",
      },
      {
        title: "Riwayat Otorisasi",
        url: "/otorisasi/history",
      },
    ],
  },
  6: {
    title: "Log Activity",
    url: "/log-activity",
    icon: ChartNoAxesColumnIcon,
  },
};

// export function isRouteAllowedForRole(role: string, pathname: string): boolean {
//   const publicRoutes = ["/", "/not-authorized"];
//   if (publicRoutes.includes(pathname)) return true;

  // const allowedMenuIds = roleMenuMapping[role];
  // if (!allowedMenuIds) return false;

  // const allowedUrls = allowedMenuIds.map((id) => menuItems[id]?.url).filter(Boolean);
  // return allowedUrls.some((url) => pathname === url || pathname.startsWith(`${url}/`));
// }

// export const roleMenuMapping: Record<string, number[]> = {
//   "OPR - DSO": [1, 2, 3],

//   "SPV 1 - DSO": [1, 4, 5],
//   "SPV 2 - DSO": [1, 4, 5],

//   "OPR - SA": [6, 7],

//   "SPV - SA": [6, 7, 8],
// };