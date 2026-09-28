import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
  type Modifier,
  type PointerSensorOptions,
} from "@dnd-kit/core";
import type { PointerEvent as ReactPointerEvent } from "react";

// Drag-and-drop plumbing shared by the seating board and the floor plan.

/**
 * Mouse and pen drags start after a few pixels of movement. Touch is left to the TouchSensor
 * below, which waits for a short press so a finger can still scroll the page.
 */
export class MouseAndPenSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: ({ nativeEvent: event }: ReactPointerEvent, { onActivation }: PointerSensorOptions) => {
        if (!event.isPrimary || event.button !== 0 || event.pointerType === "touch") return false;
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

const ARROWS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

/**
 * Keyboard dragging on the board: each arrow key jumps to the nearest drop target in that
 * direction (a table, or the unassigned list), instead of nudging a few pixels at a time.
 */
export const jumpBetweenTargets: KeyboardCoordinateGetter = (event, { context }) => {
  if (!ARROWS.has(event.code)) return undefined;
  event.preventDefault();
  const { collisionRect, droppableRects, droppableContainers, over } = context;
  if (!collisionRect) return undefined;
  const cx = collisionRect.left + collisionRect.width / 2;
  const cy = collisionRect.top + collisionRect.height / 2;

  let best: { left: number; top: number; score: number } | null = null;
  for (const container of droppableContainers.getEnabled()) {
    if (container.id === over?.id) continue;
    const rect = droppableRects.get(container.id);
    if (!rect || rect.width === 0) continue;
    const ahead =
      event.code === "ArrowRight"
        ? rect.left > cx
        : event.code === "ArrowLeft"
          ? rect.right < cx
          : event.code === "ArrowDown"
            ? rect.top > cy
            : rect.bottom < cy;
    if (!ahead) continue;
    // Distance to the nearest point of the target, with sideways travel costing double.
    const nx = Math.min(Math.max(cx, rect.left), rect.right);
    const ny = Math.min(Math.max(cy, rect.top), rect.bottom);
    const horizontal = event.code === "ArrowLeft" || event.code === "ArrowRight";
    const score = horizontal ? Math.abs(nx - cx) + 2 * Math.abs(ny - cy) : Math.abs(ny - cy) + 2 * Math.abs(nx - cx);
    if (!best || score < best.score) {
      // Land just inside the target's top-left corner, so it's the only target underneath.
      best = {
        left: rect.left + Math.min(16, Math.max(0, (rect.width - collisionRect.width) / 2)),
        top: rect.top + Math.min(16, Math.max(0, (rect.height - collisionRect.height) / 2)),
        score,
      };
    }
  }
  return best ? { x: best.left, y: best.top } : undefined;
};

/** Pointer: whatever is under the pointer. Keyboard: whatever the dragged item overlaps. */
export const pointerOrOverlap: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);

/** Keeps a dragged table inside its positioned parent (the floor-plan canvas). */
export const restrictToParent: Modifier = ({ containerNodeRect, draggingNodeRect, transform }) => {
  if (!containerNodeRect || !draggingNodeRect) return transform;
  const minX = containerNodeRect.left - draggingNodeRect.left;
  const maxX = containerNodeRect.left + containerNodeRect.width - (draggingNodeRect.left + draggingNodeRect.width);
  const minY = containerNodeRect.top - draggingNodeRect.top;
  const maxY = containerNodeRect.top + containerNodeRect.height - (draggingNodeRect.top + draggingNodeRect.height);
  return {
    ...transform,
    x: Math.min(Math.max(transform.x, minX), maxX),
    y: Math.min(Math.max(transform.y, minY), maxY),
  };
};

/** Mouse/pen, touch (press and hold) and keyboard sensors. */
export function useSeatingSensors(keyboard?: KeyboardCoordinateGetter) {
  return useSensors(
    useSensor(MouseAndPenSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, keyboard ? { coordinateGetter: keyboard } : {}),
  );
}
