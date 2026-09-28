import type { ReactElement } from "react";
import { tableFootprint, type TableShape as Shape } from "@/lib/domain/seating";

// A table drawn from above, quietly: the table itself plus one small dot per seat. Taken seats
// are filled in Desert Rose, open ones are hollow. Used on the board cards and the floor plan.

type Seat = { x: number; y: number };

function seatsFor(shape: Shape, capacity: number, w: number, h: number): { seats: Seat[]; body: ReactElement } {
  const r = 6;
  const pad = r + 2;
  const seats: Seat[] = [];
  if (shape === "ROUND") {
    const R = w / 2 - pad;
    for (let i = 0; i < capacity; i++) {
      const a = (i / capacity) * Math.PI * 2 - Math.PI / 2;
      seats.push({ x: w / 2 + R * Math.cos(a), y: h / 2 + R * Math.sin(a) });
    }
    return { seats, body: <circle cx={w / 2} cy={h / 2} r={w / 2 - pad - r - 5} /> };
  }
  if (shape === "HEAD_TABLE" || shape === "SWEETHEART") {
    // Everyone sits along one side, facing the room.
    const span = w - pad * 2;
    for (let i = 0; i < capacity; i++) seats.push({ x: pad + (span * (i + 0.5)) / capacity, y: pad });
    return { seats, body: <rect x={4} y={pad + r + 5} width={w - 8} height={h - pad - r - 9} rx={shape === "SWEETHEART" ? 12 : 6} /> };
  }
  // Rectangle: seats along both long sides.
  const top = Math.ceil(capacity / 2);
  const bottom = capacity - top;
  const span = w - pad * 2;
  for (let i = 0; i < top; i++) seats.push({ x: pad + (span * (i + 0.5)) / top, y: pad });
  for (let i = 0; i < bottom; i++) seats.push({ x: pad + (span * (i + 0.5)) / bottom, y: h - pad });
  return { seats, body: <rect x={4} y={pad + r + 5} width={w - 8} height={h - 2 * (pad + r + 5)} rx={6} /> };
}

export function TableShape({
  shape,
  capacity,
  seated,
  className = "",
  over = false,
  stroke = 1.5,
}: {
  shape: Shape;
  capacity: number;
  seated: number;
  className?: string;
  /** Draw the table in the over-capacity color. */
  over?: boolean;
  /** Line weight in drawing units; thicker when the drawing is shown small. */
  stroke?: number;
}) {
  const { w, h } = tableFootprint(shape, capacity);
  // Past 24 seats the dots would crowd; the words beside the drawing carry the count anyway.
  const drawn = Math.min(capacity, 24);
  const { seats, body } = seatsFor(shape, drawn, w, h);
  const full = Math.min(seated, drawn);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-hidden className={className} preserveAspectRatio="xMidYMid meet">
      <g className={over ? "fill-brick-wash stroke-brick" : "fill-linen stroke-rule-strong"} strokeWidth={stroke}>
        {body}
      </g>
      {seats.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={6}
          strokeWidth={stroke}
          className={i < full ? (over ? "fill-brick stroke-brick" : "fill-desert-rose stroke-desert-rose") : "fill-paper stroke-rule-strong"}
        />
      ))}
    </svg>
  );
}
