import Link from "next/link";
import { FloorPlan } from "@/components/seating/FloorPlan";
import { SeatingSummary } from "@/components/seating/SeatingSummary";
import { SeatingWorkspace } from "@/components/seating/SeatingWorkspace";
import { FirstTables } from "@/components/seating/TableForms";
import { buttonClass } from "@/components/ui/Button";
import { PageTitle } from "@/components/ui/PageTitle";
import { Tabs } from "@/components/ui/Tabs";
import { requireSession } from "@/lib/auth/require-session";
import { loadSeating } from "@/lib/data/seating";
import { seatingCounts } from "@/lib/domain/seating";

export const metadata = { title: "Seating Plan" };

export default async function SeatingPage({ searchParams }: PageProps<"/seating">) {
  await requireSession();
  const { view } = await searchParams;
  const current = view === "floor" ? "floor" : "tables";
  const { tables, guests } = await loadSeating();

  return (
    <div className="grid gap-8 sm:gap-10">
      <PageTitle
        word="Seating Plan"
        eyebrow="People"
        intro="Who sits where. Seat whole households at once, keep an eye on each table's seats, and print the chart for the venue and the caterer."
        actions={
          <>
            <Tabs
              label="Seating views"
              current={current}
              items={[
                { key: "tables", label: "Tables", href: "/seating" },
                { key: "floor", label: "Floor plan", href: "/seating?view=floor" },
              ]}
            />
            <Link href="/seating/print" className={buttonClass("secondary", "sm")}>
              Print chart
            </Link>
          </>
        }
      />

      {current === "floor" ? (
        <div className="grid gap-8 sm:gap-10">
          <SeatingSummary counts={seatingCounts(tables, guests)} />
          {tables.length === 0 ? <FirstTables tables={tables} /> : <FloorPlan tables={tables} guests={guests} />}
        </div>
      ) : (
        <SeatingWorkspace tables={tables} guests={guests} />
      )}
    </div>
  );
}
