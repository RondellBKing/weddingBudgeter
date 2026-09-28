"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { sessionCookieName } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseMoneyToCents, parsePercentToPpm } from "@/lib/money";

export type SettingsState = { ok: boolean; message: string; errors?: Record<string, string> };

const clock = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time, like 16:30");

const schema = z.object({
  partnerOneName: z.string().trim().min(1, "Required").max(80),
  partnerTwoName: z.string().trim().min(1, "Required").max(80),
  ceremonyTime: z.union([z.literal(""), clock]),
  venueAddress: z.string().trim().min(1, "Required").max(200),
  headcountTarget: z.coerce.number().int("Whole number").min(0).max(2000),
  totalBudget: z.string(),
  includedHeadcount: z.coerce.number().int("Whole number").min(0).max(2000),
  perPersonOverage: z.string(),
  overageTaxPercent: z.string(),
  vendorMealsCountTowardHeadcount: z.boolean(),
});

export async function saveSettings(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  await requireSession();
  const parsed = schema.safeParse({
    ...Object.fromEntries(form),
    vendorMealsCountTowardHeadcount: form.get("vendorMealsCountTowardHeadcount") === "on",
  });
  const errors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;
    return { ok: false, message: "Check the highlighted fields.", errors };
  }
  const v = parsed.data;
  const totalBudgetCents = parseMoneyToCents(v.totalBudget);
  const perPersonOverageCents = parseMoneyToCents(v.perPersonOverage);
  const overageTaxPpm = v.overageTaxPercent.trim() === "" ? 0 : parsePercentToPpm(v.overageTaxPercent);
  if (totalBudgetCents === null || totalBudgetCents < 0) errors.totalBudget = "Enter an amount like 100,000";
  if (perPersonOverageCents === null || perPersonOverageCents < 0) errors.perPersonOverage = "Enter an amount like 200";
  if (overageTaxPpm === null) errors.overageTaxPercent = "Enter a percentage like 6.625, or 0";
  if (Object.keys(errors).length > 0) return { ok: false, message: "Check the highlighted fields.", errors };

  await prisma.weddingSettings.update({
    where: { id: 1 },
    data: {
      partnerOneName: v.partnerOneName,
      partnerTwoName: v.partnerTwoName,
      ceremonyTime: v.ceremonyTime === "" ? null : v.ceremonyTime,
      venueAddress: v.venueAddress,
      headcountTarget: v.headcountTarget,
      totalBudgetCents: totalBudgetCents!,
      includedHeadcount: v.includedHeadcount,
      perPersonOverageCents: perPersonOverageCents!,
      overageTaxPpm: overageTaxPpm!,
      vendorMealsCountTowardHeadcount: v.vendorMealsCountTowardHeadcount,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

/** Signs out every device, including this one, and changes the calendar feed link. */
export async function logOutEverywhere(): Promise<void> {
  await requireSession();
  await prisma.authState.update({
    where: { id: 1 },
    data: { sessionEpoch: { increment: 1 }, icsToken: randomBytes(24).toString("base64url") },
  });
  (await cookies()).delete(sessionCookieName());
  redirect("/login?signedOut=everywhere");
}
