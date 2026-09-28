import Link from "next/link";
import { ItemForm } from "@/components/budget/ItemForm";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { loadBudgetOptions } from "@/lib/data/budget";
import { createItem } from "../../actions";

export const metadata = { title: "New budget item" };

export default async function NewItemPage({ searchParams }: PageProps<"/budget/items/new">) {
  const params = await searchParams;
  const { categories, vendors } = await loadBudgetOptions();
  const pick = (v: unknown) => (typeof v === "string" ? v : "");
  return (
    <div className="grid gap-8">
      <PageTitle
        lead="New"
        word="Budget Item"
        eyebrow="Money"
        intro="A contract, a purchase or anything you'll pay for. Add its payment schedule on the next screen."
      />
      <Card className="p-6 sm:p-8">
        <ItemForm
          action={createItem}
          submitLabel="Create item"
          categories={categories}
          vendors={vendors}
          values={{
            categoryId: pick(params.categoryId),
            vendorId: pick(params.vendorId),
            description: "",
            estimate: "",
            contracted: "",
            notes: "",
          }}
        />
      </Card>
      <Link href="/budget?view=items" className="text-sm text-rose-ink hover:text-chocolate">
        ← Back to budget items
      </Link>
    </div>
  );
}
