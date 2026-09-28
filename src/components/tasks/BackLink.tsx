import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

/** "← Tasks" above a form page. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex w-fit items-center gap-1.5 text-[13px] text-rose-ink hover:text-chocolate">
      <Icon name="arrow" size={14} className="rotate-180" />
      {children}
    </Link>
  );
}
