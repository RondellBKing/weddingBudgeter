import Link from "next/link";
import { NAV_GROUPS, SETTINGS_ITEM } from "@/components/shell/nav";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PageTitle } from "@/components/ui/PageTitle";
import { requireSession } from "@/lib/auth/require-session";

export const metadata = { title: "More" };

export default async function MorePage() {
  await requireSession();
  const items = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM];
  return (
    <div className="grid gap-8">
      <PageTitle lead="Everything" word="Else" />
      <Card className="px-2">
        <ul>
          {items.map((item) => (
            <li key={item.href} className="border-b border-rule last:border-b-0">
              <Link href={item.href} className="flex items-center gap-4 px-4 py-4 text-[17px]">
                <Icon name={item.icon} size={22} className="text-rose-ink" />
                <span className="flex-1">{item.label}</span>
                <Icon name="arrow" size={16} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
