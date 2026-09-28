import { ToneBadge, type Tone } from "@/components/ui/Tone";
import type { VendorPaymentState } from "@/lib/domain/vendor-money";

const TONE: Record<VendorPaymentState, Tone> = {
  paid: "on-track",
  "due-soon": "due-soon",
  overdue: "overdue",
  upcoming: "neutral",
};

const WORD: Record<VendorPaymentState, string> = {
  paid: "Paid",
  "due-soon": "Due soon",
  overdue: "Overdue",
  upcoming: "Upcoming",
};

/** Paid / Due soon / Overdue / Upcoming, always as a word with its color. */
export function PaymentStateBadge({ state }: { state: VendorPaymentState }) {
  return <ToneBadge tone={TONE[state]}>{WORD[state]}</ToneBadge>;
}
