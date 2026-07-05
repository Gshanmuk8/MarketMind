import {
  LayoutDashboard,
  Radar,
  Cpu,
  FileText,
  MessageSquare,
  Scale,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

/** Primary navigation. Order reflects the daily workflow. */
export const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Competitors", href: "/competitors", icon: Radar },
  { title: "Technology", href: "/technology", icon: Cpu },
  { title: "Decisions", href: "/decisions", icon: Scale },
  { title: "Reports", href: "/reports", icon: FileText },
  { title: "Chat", href: "/chat", icon: MessageSquare },
];

export const secondaryNav: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings },
];
