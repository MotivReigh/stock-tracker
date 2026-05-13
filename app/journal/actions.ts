"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth/user";
import * as journal from "@/lib/journal/queries";

export type ActionResult = { ok: true } | { ok: false; error: string };

const symbolSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9.-]{1,10}$/, "Invalid symbol");

const bodySchema = z
  .string()
  .trim()
  .min(1, "Note can't be empty")
  .max(10_000, "Note is too long (10k char limit)");

export async function createNoteAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const symParsed = symbolSchema.safeParse(formData.get("symbol"));
  if (!symParsed.success) {
    return { ok: false, error: symParsed.error.issues[0].message };
  }
  const bodyParsed = bodySchema.safeParse(formData.get("body"));
  if (!bodyParsed.success) {
    return { ok: false, error: bodyParsed.error.issues[0].message };
  }

  const userId = getCurrentUserId();
  try {
    await journal.createNote(userId, symParsed.data, bodyParsed.data);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  revalidatePath("/journal");
  revalidatePath(`/stock/${symParsed.data}`);
  revalidatePath("/");
  return { ok: true };
}

export async function updateNoteAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "Missing note id" };
  }
  const bodyParsed = bodySchema.safeParse(formData.get("body"));
  if (!bodyParsed.success) {
    return { ok: false, error: bodyParsed.error.issues[0].message };
  }

  const userId = getCurrentUserId();
  try {
    // Look up note to find its symbol for path revalidation.
    const existing = await journal.getNote(userId, id);
    if (!existing) {
      return { ok: false, error: "Note not found" };
    }
    await journal.updateNote(userId, id, bodyParsed.data);
    revalidatePath("/journal");
    revalidatePath(`/stock/${existing.symbol}`);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  return { ok: true };
}

export async function deleteNoteAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;
  const userId = getCurrentUserId();
  const existing = await journal.getNote(userId, id);
  if (!existing) return;
  await journal.deleteNote(userId, id);
  revalidatePath("/journal");
  revalidatePath(`/stock/${existing.symbol}`);
  revalidatePath("/");
}
