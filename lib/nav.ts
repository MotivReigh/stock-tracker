import { LayoutDashboard, Radar, Star, BookOpenText, BarChart3, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scans", label: "Scans", icon: Radar },
  { href: "/watchlists", label: "Watchlists", icon: Star },
  { href: "/journal", label: "Journal", icon: BookOpenText },
  { href: "/sectors", label: "Sectors", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];
