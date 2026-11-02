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
