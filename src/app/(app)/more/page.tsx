import Link from "next/link";
import { NAV_GROUPS } from "@/components/shell/nav";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";

export const metadata = { title: "More" };

export default async function MorePage() {
  await requireSession();
  const items = [...NAV_GROUPS.flatMap((g) => g.items), { href: "/settings", label: "Settings" }];
  return (
    <div className="grid gap-8">
      <PageTitle lead="Everything" word="Else" />
      <ul className="border-b border-rule">
        {items.map((item) => (
          <li key={item.href} className="border-t border-rule">
            <Link href={item.href} className="flex items-center justify-between py-4 text-lg">
              {item.label}
              <span aria-hidden className="text-muted">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
