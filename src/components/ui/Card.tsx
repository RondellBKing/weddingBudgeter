import type { ReactNode } from "react";

/** A sheet of paper on the ivory page. `framed` adds the inner hairline of an invitation card. */
export function Card({
  children,
  className = "",
  framed = false,
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  framed?: boolean;
  as?: "section" | "div" | "article";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={`relative rounded-[3px] border border-rule bg-paper shadow-[0_1px_2px_rgba(62,43,34,0.04),0_8px_24px_-16px_rgba(62,43,34,0.18)] ${className}`}
      {...rest}
    >
      {framed ? <span aria-hidden className="pointer-events-none absolute inset-2 rounded-[2px] border border-gold/25" /> : null}
      {children}
    </Tag>
  );
}

/** Small uppercase heading row used at the top of cards. */
export function CardHeading({ title, action, id }: { title: string; action?: ReactNode; id?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className="label-caps">
        {title}
      </h2>
      {action}
    </div>
  );
}
