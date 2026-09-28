import { ToneBadge } from "@/components/ui/Tone";
import { statusGroup, VENDOR_STATUS_LABEL, type VendorStatus } from "@/lib/domain/vendors";

/** Booked reads as on track; everything else is a plain word (declined and cancelled muted). */
export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  return (
    <ToneBadge tone={statusGroup(status) === "booked" ? "on-track" : "neutral"}>{VENDOR_STATUS_LABEL[status]}</ToneBadge>
  );
}
