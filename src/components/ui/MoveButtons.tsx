"use client";

import { useFormStatus } from "react-dom";
import { Icon } from "@/components/ui/Icon";

type FormAction = (formData: FormData) => void | Promise<void>;

function Arrow({ direction, label, disabled }: { direction: "up" | "down"; label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-label={label}
      title={direction === "up" ? "Move up" : "Move down"}
      className="grid size-8 place-items-center rounded-full text-cocoa transition-colors hover:bg-linen hover:text-chocolate disabled:cursor-default disabled:text-rule-strong disabled:hover:bg-transparent"
    >
      <Icon name="arrow" size={15} className={direction === "up" ? "-rotate-90" : "rotate-90"} />
    </button>
  );
}

/**
 * Move up / move down for a row in an ordered list. `up` and `down` are Server Actions bound to
 * the row; null means the row is already at that end (the button stays, disabled, so rows line up).
 * A row that's alone in its list has nothing to move past, so it shows no arrows at all.
 */
export function MoveButtons({ up, down, name }: { up: FormAction | null; down: FormAction | null; name: string }) {
  if (!up && !down) return null;
  return (
    <div className="flex items-center" role="group" aria-label={`Reorder ${name}`}>
      <form action={up ?? undefined}>
        <Arrow direction="up" label={`Move up: ${name}`} disabled={!up} />
      </form>
      <form action={down ?? undefined}>
        <Arrow direction="down" label={`Move down: ${name}`} disabled={!down} />
      </form>
    </div>
  );
}
