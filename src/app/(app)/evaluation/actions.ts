"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { runAllCases, runCase } from "@/server/services/evaluation";
import { getStore } from "@/server/store/memory-store";
import { can } from "@/domain/permissions";

export async function runEvaluationAction(formData: FormData) {
  const user = await requireUser();
  if (!can(user, "evaluation")) redirect("/");
  const caseId = formData.get("caseId");
  if (typeof caseId === "string" && caseId) {
    const testCase = getStore().evaluationCases.find((c) => c.id === caseId);
    if (testCase) await runCase(user, testCase);
  } else {
    await runAllCases(user);
  }
  revalidatePath("/evaluation");
}
