"use client";

import { useFormStatus } from "react-dom";
import { setFavorite } from "@/app/(app)/design/actions";
import { Icon } from "@/components/ui/Icon";

/** The star on a board card: one click keeps it as a favorite, another lets it go. */
export function FavoriteButton({ id, favorite, title }: { id: string; favorite: boolean; title: string }) {
  return (
    <form action={setFavorite.bind(null, id, !favorite)}>
      <Star favorite={favorite} title={title} />
    </form>
  );
}

function Star({ favorite, title }: { favorite: boolean; title: string }) {
  const { pending } = useFormStatus();
  // Show the new state while the server catches up.
  const shown = pending ? !favorite : favorite;
  return (
    <button
      type="submit"
      aria-pressed={favorite}
      aria-label={`Favorite: ${title}`}
      title={favorite ? "Remove from favorites" : "Add to favorites"}
      className="grid size-9 place-items-center rounded-full border border-rule bg-paper/95 shadow-[0_1px_2px_rgba(62,43,34,0.08)] transition-colors hover:border-rule-strong"
    >
      <Icon
        name="star"
        size={18}
        className={`transition-colors ${shown ? "fill-desert-rose text-desert-rose" : "fill-transparent text-cocoa"} ${pending ? "opacity-70" : ""}`}
      />
    </button>
  );
}
