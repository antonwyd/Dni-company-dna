"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CATEGORIES, CLASSIFICATIONS, KNOWLEDGE_TYPES, LANGUAGES } from "@/domain/types";
import { requireUser } from "@/server/auth/session";
import { answerQuestion, CaptureError, finishQuestions, skipQuestion, startCapture, submitForReview } from "@/server/services/capture";

const startSchema = z.object({
  statement: z.string().trim().min(1).max(4000),
  type: z.enum(KNOWLEDGE_TYPES).default("personal_experience"),
  category: z.enum(CATEGORIES).nullable().default(null),
  classification: z.enum(CLASSIFICATIONS).default("department_restricted"),
  language: z.enum(LANGUAGES).default("id"),
});

const idSchema = z.string().regex(/^C-\d{4,}$/);

function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" && value !== "" ? value : undefined;
}

export async function startCaptureAction(formData: FormData) {
  const user = await requireUser();
  const parsed = startSchema.safeParse({
    statement: field(formData, "statement"),
    type: field(formData, "type"),
    category: field(formData, "category") ?? null,
    classification: field(formData, "classification"),
    language: field(formData, "language"),
  });
  if (!parsed.success) redirect("/capture?error=empty");
  const session = await startCapture(user, parsed.data);
  redirect(`/capture/${session.id}`);
}

async function withSession(formData: FormData, run: (userId: Awaited<ReturnType<typeof requireUser>>, id: string) => Promise<unknown>) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("sessionId"));
  if (!id.success) redirect("/capture");
  try {
    await run(user, id.data);
  } catch (error) {
    if (error instanceof CaptureError) redirect(`/capture/${id.data}?error=${error.code}`);
    throw error;
  }
  revalidatePath(`/capture/${id.data}`);
  redirect(`/capture/${id.data}`);
}

export async function answerAction(formData: FormData) {
  const text = z.string().trim().min(1).max(4000).safeParse(formData.get("answer"));
  const id = String(formData.get("sessionId") ?? "");
  if (!text.success) redirect(`/capture/${encodeURIComponent(id)}?error=empty`);
  await withSession(formData, (user, sessionId) => answerQuestion(user, sessionId, text.data));
}

export async function skipAction(formData: FormData) {
  await withSession(formData, (user, sessionId) => skipQuestion(user, sessionId));
}

export async function finishAction(formData: FormData) {
  await withSession(formData, (user, sessionId) => finishQuestions(user, sessionId));
}

export async function submitAction(formData: FormData) {
  await withSession(formData, async (user, sessionId) => submitForReview(user, sessionId));
}
