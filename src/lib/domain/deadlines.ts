import { daysBetween, type CalendarDate } from "../dates";

// Escalating urgency for hard deadlines like the Nov 7, 2027 dress sizing deadline.

export type UrgencyLevel = "calm" | "90" | "60" | "30" | "14" | "7" | "overdue";
export type Tone = "on-track" | "due-soon" | "overdue";

const STEPS: Array<[number, UrgencyLevel]> = [
  [7, "7"],
  [14, "14"],
  [30, "30"],
  [60, "60"],
  [90, "90"],
];

export function deadlineUrgency(deadline: CalendarDate, today: CalendarDate) {
  const daysLeft = daysBetween(today, deadline);
  let level: UrgencyLevel = "calm";
  if (daysLeft < 0) level = "overdue";
  else {
    for (const [limit, name] of STEPS) {
      if (daysLeft <= limit) {
        level = name;
        break;
      }
    }
  }
  const tone: Tone = level === "overdue" ? "overdue" : daysLeft <= 30 ? "due-soon" : "on-track";
  return { daysLeft, level, tone };
}
