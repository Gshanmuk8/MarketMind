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
  /** Curatorial room name — the app reads as a museum of intelligence rooms. */
  room: string;
}

/** Primary navigation. Order reflects the daily workflow. Each section is a
 *  named room in the intelligence archive (surfaced in the index and the folio
 *  breadcrumb) so moving through the app feels spatial, not tabbed. */
export const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, room: "Observatory" },
  { title: "Competitors", href: "/competitors", icon: Radar, room: "Market Atlas" },
  { title: "Technology", href: "/technology", icon: Cpu, room: "Signal Lab" },
  { title: "Decisions", href: "/decisions", icon: Scale, room: "War Room" },
  { title: "Reports", href: "/reports", icon: FileText, room: "Archive" },
  { title: "Chat", href: "/chat", icon: MessageSquare, room: "Analyst" },
];

export const secondaryNav: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings, room: "Control Room" },
];
