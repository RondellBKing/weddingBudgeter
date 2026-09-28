"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV, NAV_GROUPS, isActive } from "./nav";

export function SidebarLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="grid gap-7">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="grid gap-2">
          <p className="label-caps">{group.label}</p>
          <ul className="grid gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`block border-l-2 py-1.5 pl-3 text-[15px] transition-colors ${
                      active
                        ? "border-desert-rose font-medium text-chocolate"
                        : "border-transparent text-cocoa hover:border-rule-strong hover:text-chocolate"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="grid gap-2">
        <p className="label-caps">Settings</p>
        <Link
          href="/settings"
          aria-current={isActive(pathname, "/settings") ? "page" : undefined}
          className={`block border-l-2 py-1.5 pl-3 text-[15px] ${
            isActive(pathname, "/settings")
              ? "border-desert-rose font-medium text-chocolate"
              : "border-transparent text-cocoa hover:border-rule-strong hover:text-chocolate"
          }`}
        >
          Settings
        </Link>
      </div>
    </nav>
  );
}

export function BottomNavLinks() {
  const pathname = usePathname();
  const inMore = !BOTTOM_NAV.slice(0, 4).some((i) => isActive(pathname, i.href));
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {BOTTOM_NAV.map((item) => {
          const active = item.href === "/more" ? inMore : isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium tracking-[0.08em] uppercase ${
                  active ? "text-chocolate" : "text-muted"
                }`}
              >
                <span aria-hidden className={`h-0.5 w-5 rounded-full ${active ? "bg-desert-rose" : "bg-transparent"}`} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
