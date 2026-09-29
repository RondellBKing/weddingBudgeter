import { deleteBagItem, markBagItem } from "@/app/(app)/travel/actions";
import { ConfirmButton } from "@/components/form/ConfirmButton";
import { SubmitButton } from "@/components/form/SubmitButton";
import { Tag } from "@/components/guests/bits";
import { ToneBadge } from "@/components/ui/Tone";
import type { BagItemView } from "@/lib/data/travel";
import { formatDate } from "@/lib/dates";
import { BAG_STATUS, bagItemStatus, bagProgress, toBuy, type BagCount } from "@/lib/domain/travel";
import { Reveal, RowEditor } from "./RowEditor";
import { BagItemForm, type BagItemValues } from "./TravelForms";

function values(i: BagItemView): BagItemValues {
  return { name: i.name, perBag: String(i.perBag), orderedOn: i.orderedOn ?? "", receivedOn: i.receivedOn ?? "", notes: i.notes ?? "" };
}

/** The suggested number of bags, and the assumption behind it. */
function BagSuggestion({ bags }: { bags: BagCount }) {
  if (!bags.hasGuestList) {
    return (
      <div className="grid gap-1.5 border-b border-rule pb-6">
        <p className="label-caps">How many bags</p>
        <p className="max-w-prose text-[15px] leading-relaxed text-cocoa">
          There&apos;s no guest list yet, so there&apos;s nothing to count. Once it&apos;s imported from the RSVP app, this
          suggests one bag per household that hasn&apos;t declined, and works out how many of each item to buy.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-x-8 gap-y-3 border-b border-rule pb-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
      <div className="grid justify-items-start gap-1">
        <span className="num font-display text-[56px] leading-[0.85]">{bags.bags}</span>
        <span className="label-caps text-[10px]">{bags.bags === 1 ? "bag to make" : "bags to make"}</span>
      </div>
      <p className="max-w-prose text-[15px] leading-relaxed text-cocoa">
        One per household that hasn&apos;t declined: {bags.bags} of the {bags.households} households on the guest list.
        Pending counts as coming, the same as the headcount. If only hotel guests get a bag, you&apos;ll need fewer.
      </p>
    </div>
  );
}

function Item({ item, bags }: { item: BagItemView; bags: BagCount }) {
  const status = bagItemStatus(item);
  const s = BAG_STATUS[status];
  const total = toBuy(item.perBag, bags);
  return (
    <div className="grid gap-1.5">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[16px]">{item.name}</span>
        {item.isDemo ? <Tag tone="demo">Demo</Tag> : null}
      </p>
      <p className="num flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-cocoa">
        <span>{item.perBag} per bag</span>
        <span>
          {total === null ? <span className="text-muted">To buy: after the guest list</span> : <strong className="font-medium text-chocolate">{total} to buy</strong>}
        </span>
      </p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
        <ToneBadge tone={s.tone}>{s.label}</ToneBadge>
        {item.orderedOn ? <span className="num">Ordered {formatDate(item.orderedOn, "medium")}</span> : null}
        {item.receivedOn ? <span className="num">Received {formatDate(item.receivedOn, "medium")}</span> : null}
      </p>
      {item.notes ? <p className="text-[13px] whitespace-pre-line text-muted">{item.notes}</p> : null}
    </div>
  );
}

/** One-tap next step: ordered today, then received today. */
function NextStep({ item }: { item: BagItemView }) {
  const status = bagItemStatus(item);
  if (status === "received") return null;
  const step = status === "not-ordered" ? "ordered" : "received";
  return (
    <form action={markBagItem.bind(null, item.id, step)}>
      <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
        {step === "ordered" ? "Ordered today" : "Received today"}
        <span className="sr-only"> ({item.name})</span>
      </SubmitButton>
    </form>
  );
}

export function WelcomeBags({ items, bags }: { items: BagItemView[]; bags: BagCount }) {
  const p = bagProgress(items);
  const blank: BagItemValues = { name: "", perBag: "1", orderedOn: "", receivedOn: "", notes: "" };
  return (
    <div className="grid gap-6">
      <BagSuggestion bags={bags} />

      {items.length === 0 ? (
        <p className="max-w-prose text-[15px] leading-relaxed text-cocoa">
          Nothing in the bags yet. Add each item and how many go in one bag; the totals follow the guest list.
        </p>
      ) : (
        <div className="grid gap-2">
          <p className="num text-[13px] text-muted">
            {p.total} {p.total === 1 ? "item" : "items"} · {p.notOrdered} not ordered · {p.ordered} ordered · {p.received} received
          </p>
          <ul className="border-t border-rule">
            {items.map((i) => (
              <li key={i.id} className="border-b border-rule py-4 last:border-b-0">
                <RowEditor
                  label={i.name}
                  actions={<NextStep item={i} />}
                  editor={
                    <div className="grid gap-5">
                      <BagItemForm id={i.id} values={values(i)} idPrefix={`bag-${i.id}-`} />
                      <div className="border-t border-rule pt-4">
                        <ConfirmButton action={deleteBagItem.bind(null, i.id)} question={`Delete ${i.name}?`} confirmLabel="Yes, delete">
                          Delete item
                        </ConfirmButton>
                      </div>
                    </div>
                  }
                >
                  <Item item={i} bags={bags} />
                </RowEditor>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Reveal label="Add an item" defaultOpen={items.length === 0}>
        <BagItemForm id={null} values={blank} idPrefix="add-bag-" />
      </Reveal>
    </div>
  );
}
