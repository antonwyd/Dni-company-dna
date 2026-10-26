"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { APPROVAL_ACTIONS } from "@/domain/types";
import { requireUser } from "@/server/auth/session";
import { applyReviewAction } from "@/server/services/review";

const schema = z.object({
  itemId: z.string().regex(/^K-\d{4,}$/),
  action: z.enum(APPROVAL_ACTIONS).exclude(["submit_for_review"]),
  note: z.string().max(1000).default(""),
});

export async function reviewAction(formData: FormData) {
  const user = await requireUser();
  const parsed = schema.safeParse({
    itemId: formData.get("itemId"),
    action: formData.get("action"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) redirect("/reviews");
  // The actor is always the signed-in human; nothing from the client can claim otherwise.
  const result = applyReviewAction({ kind: "human", user }, parsed.data.itemId, parsed.data.action, parsed.data.note);
  revalidatePath("/", "layout");
  if (!result.ok) {
    if (result.reason === "not_found") redirect("/reviews");
    redirect(`/reviews/${parsed.data.itemId}?error=${result.reason}`);
  }
  redirect(`/reviews/${parsed.data.itemId}?done=1`);
}
