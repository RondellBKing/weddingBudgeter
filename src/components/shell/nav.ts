import type { IconName } from "@/components/ui/Icon";

// Navigation, grouped the way a planner's binder is: the plan first, then money, people, guest
// care, design and the wedding day itself.

export type NavItem = { href: string; label: string; icon: IconName };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  { label: "Overview", items: [{ href: "/", label: "Dashboard", icon: "home" }] },
  {
    label: "Plan",
    items: [
      { href: "/planning", label: "Planning Timeline", icon: "timeline" },
      { href: "/tasks", label: "Tasks", icon: "tasks" },
      { href: "/calendar", label: "Calendar", icon: "calendar" },
      { href: "/decisions", label: "Decisions", icon: "decisions" },
    ],
  },
  { label: "Money", items: [{ href: "/budget", label: "Budget", icon: "budget" }] },
  {
    label: "People",
    items: [
      { href: "/vendors", label: "Vendors", icon: "vendors" },
      { href: "/party", label: "Wedding Party", icon: "party" },
      { href: "/guests", label: "Guests", icon: "guests" },
      { href: "/seating", label: "Seating", icon: "seating" },
    ],
  },
  {
    label: "Guest care",
    items: [
      { href: "/travel", label: "Hotels & Travel", icon: "travel" },
      { href: "/meals", label: "Meals", icon: "meals" },
      { href: "/gifts", label: "Gifts", icon: "gift" },
    ],
  },
  {
    label: "Design",
    items: [{ href: "/design", label: "Vision & Décor", icon: "design" }],
  },
  {
    label: "Wedding day",
    items: [
      { href: "/timeline", label: "Day-of Timeline", icon: "clock" },
      { href: "/music", label: "Music", icon: "music" },
      { href: "/photos", label: "Photos", icon: "camera" },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: "settings" };

/** Phone bottom bar: the four screens used most, plus everything else behind "More". */
export const BOTTOM_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/budget", label: "Budget", icon: "budget" },
  { href: "/tasks", label: "Tasks", icon: "tasks" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/more", label: "More", icon: "more" },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
