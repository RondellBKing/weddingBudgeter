import type { ReactNode } from "react";

/**
 * The shape of a row in an ordered list (songs, the processional, shots). From `sm` up the
 * actions sit to the right of the text. On phones they drop to their own line under the text,
 * beside `meta`, so the text keeps the full width instead of wrapping every few words.
 */
export function RowLayout({ lead, body, meta, actions }: { lead?: ReactNode; body: ReactNode; meta?: ReactNode; actions: ReactNode }) {
  if (lead) {
    return (
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4">
        <div className="row-span-2">{lead}</div>
        <div className="min-w-0 [overflow-wrap:anywhere]">{body}</div>
        <div className="col-start-2 flex min-h-8 items-center justify-between gap-3 sm:contents">
          <div className="min-w-0 sm:col-start-2">{meta}</div>
          <div className="flex shrink-0 items-center gap-1 sm:col-start-3 sm:row-start-1 sm:-my-1">{actions}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-x-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0 [overflow-wrap:anywhere]">{body}</div>
      <div className="flex min-h-8 items-center justify-between gap-3 sm:contents">
        <div className="min-w-0 sm:col-start-1">{meta}</div>
        <div className="flex shrink-0 items-center gap-1 sm:col-start-2 sm:row-start-1 sm:-my-1">{actions}</div>
      </div>
    </div>
  );
}
