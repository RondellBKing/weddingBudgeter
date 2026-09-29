"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { BOTTOM_NAV, NAV_GROUPS, SETTINGS_ITEM, isActive, type NavItem } from "./nav";

function SideLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-[2px] px-3 py-[7px] text-[14.5px] transition-colors ${
        active ? "bg-ivory/[0.08] text-ivory" : "text-ivory/75 hover:bg-ivory/[0.04] hover:text-ivory"
      }`}
    >
      {active ? <span aria-hidden className="absolute inset-y-1.5 left-0 w-[2px] bg-dusty-rose" /> : null}
      <Icon
        name={item.icon}
        size={18}
        className={active ? "text-dusty-rose" : "text-ivory/45 transition-colors group-hover:text-ivory/75"}
      />
      {item.label}
    </Link>
  );
}

export function SidebarLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="grid gap-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="grid gap-0.5">
          <p className="px-3 pb-1 text-[10px] font-medium tracking-[0.2em] text-gold-light/90 uppercase">{group.label}</p>
          {group.items.map((item) => (
            <SideLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      ))}
      <div className="grid gap-1 border-t border-ivory/10 pt-4">
        <SideLink item={SETTINGS_ITEM} pathname={pathname} />
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_24px_-18px_rgba(62,43,34,0.35)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {BOTTOM_NAV.map((item) => {
          const active = item.href === "/more" ? inMore : isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] font-medium tracking-[0.06em] uppercase ${
                  active ? "text-chocolate" : "text-muted"
                }`}
              >
                <Icon name={item.icon} size={22} className={active ? "text-rose-ink" : ""} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
