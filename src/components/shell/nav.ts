// Navigation. Groups leave room for the deferred modules (catering, day-of, vision board…)
// to slot in without reshuffling everything.

export type NavItem = { href: string; label: string };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  { label: "Overview", items: [{ href: "/", label: "Dashboard" }] },
  { label: "Money", items: [{ href: "/budget", label: "Budget" }] },
  {
    label: "People",
    items: [
      { href: "/vendors", label: "Vendors" },
      { href: "/party", label: "Wedding Party" },
      { href: "/guests", label: "Guests" },
      { href: "/seating", label: "Seating" },
    ],
  },
  {
    label: "Plan",
    items: [
      { href: "/tasks", label: "Tasks" },
      { href: "/calendar", label: "Calendar" },
      { href: "/decisions", label: "Decisions" },
    ],
  },
];

/** Phone bottom bar: the four screens used most, plus everything else behind "More". */
export const BOTTOM_NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/budget", label: "Budget" },
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar", label: "Calendar" },
  { href: "/more", label: "More" },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
