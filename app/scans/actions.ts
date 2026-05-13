"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth/user";
import * as scans from "@/lib/scans/queries";
import { runScanAndPersist } from "@/lib/scans/runner";
import type {
  Indicator,
  Operator,
  Predicate,
  ScanCondition,
  ScanDefinition,
} from "@/lib/scans/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const indicators: Indicator[] = [
  "price",
  "pctChange1d",
  "pctChange5d",
  "pctChange21d",
  "pctChange63d",
  "relVol",
  "rsScore",
  "rsi",
  "macdHistogram",
  "smaSlope20",
  "atrPct",
  "fiftyTwoWeekHighDistance",
  "marketCap",
];

const predicates: Predicate[] = [
  "maAligned",
  "maCompression",
  "breakout52wHigh",
  "breakout50dHigh",
  "tightConsolidation",
  "volumeDryUp",
  "pullbackToMa20",
  "pullbackToMa50",
];

const operators: Operator[] = [">", ">=", "<", "<=", "=", "between"];

const numericConditionSchema = z.object({
  kind: z.literal("numeric"),
  indicator: z.enum(indicators as [Indicator, ...Indicator[]]),
  operator: z.enum(operators as [Operator, ...Operator[]]),
  value: z.coerce.number(),
  valueHi: z.coerce.number().optional(),
});

const predicateConditionSchema = z.object({
  kind: z.literal("predicate"),
  predicate: z.enum(predicates as [Predicate, ...Predicate[]]),
  expected: z.boolean(),
});

const conditionSchema = z.discriminatedUnion("kind", [
  numericConditionSchema,
  predicateConditionSchema,
]);

const definitionSchema = z.object({
  version: z.literal(1),
  combinator: z.enum(["and", "or"]),
  conditions: z.array(conditionSchema).min(1, "Add at least one condition"),
  universe: z
    .object({
      minMarketCap: z.number().optional(),
      sector: z.array(z.string()).optional(),
      symbols: z.array(z.string()).optional(),
    })
    .optional(),
});

const createScanSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  definition: definitionSchema,
});

export async function createCustomScanAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const raw = formData.get("payload");
  if (typeof raw !== "string") return { ok: false, error: "Missing payload" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  const result = createScanSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: result.error.issues[0].message };
  }
  const userId = getCurrentUserId();
  try {
    const scan = await scans.createCustomScan(
      userId,
      result.data.name,
      result.data.definition as ScanDefinition,
    );
    revalidatePath("/scans");
    revalidatePath("/");
    redirect(`/scans/${scan.id}`);
  } catch (err) {
    // redirect() throws internally; surface only real errors.
    if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteScanAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;
  const userId = getCurrentUserId();
  await scans.deleteScan(userId, id);
  revalidatePath("/scans");
  revalidatePath("/");
  redirect("/scans");
}

export async function runScanNowAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;
  const userId = getCurrentUserId();
  const scan = await scans.getScan(userId, id);
  if (!scan) return;
  await runScanAndPersist(scan);
  revalidatePath(`/scans/${id}`);
  revalidatePath("/scans");
  revalidatePath("/");
}

export async function markResultSeenAction(formData: FormData): Promise<void> {
  const id = formData.get("result_id");
  if (typeof id !== "string" || id.length === 0) return;
  await scans.markResultSeen(id);
  const scanId = formData.get("scan_id");
  if (typeof scanId === "string" && scanId) {
    revalidatePath(`/scans/${scanId}`);
  }
}

/** Re-exported so the builder UI can render the canonical lists. */
export async function getBuilderVocabulary(): Promise<{
  indicators: Indicator[];
  predicates: Predicate[];
  operators: Operator[];
}> {
  return { indicators, predicates, operators };
}

export type BuilderCondition = ScanCondition;
