import { can, canReadItem } from "@/domain/permissions";
import type { EvaluationCase, EvaluationRun, Profile } from "@/domain/types";
import type { AIProvider } from "@/server/ai/provider";
import { getAIProvider } from "@/server/ai";
import { getStore, nextId, nowIso } from "@/server/store/memory-store";
import { ask } from "./ask";
import { recordAudit } from "./audit";
import { getItemForUser } from "./knowledge";

export class EvaluationError extends Error {}

/**
 * Run one evaluation case through the SAME services the app uses and record
 * the actual result. Nothing is assumed to pass.
 */
export async function runCase(evaluator: Profile, testCase: EvaluationCase, ai: AIProvider = getAIProvider()): Promise<EvaluationRun> {
  if (!can(evaluator, "evaluation")) throw new EvaluationError("forbidden");
  const store = getStore();
  const actor = store.profiles.find((p) => p.id === testCase.actorId);
  if (!actor) throw new EvaluationError("unknown actor");

  let passed = false;
  let actualSummary = "";
  let evidenceQuality: EvaluationRun["evidenceQuality"] = "not_applicable";

  switch (testCase.expected) {
    case "deny_access": {
      const item = testCase.targetItemId ? getItemForUser(actor, testCase.targetItemId) : null;
      passed = item === null;
      actualSummary = passed ? "Akses ditolak (record tidak dikembalikan)." : "Record DIKEMBALIKAN ke pengguna yang tidak berwenang.";
      break;
    }
    case "flag_conflict": {
      const id = testCase.targetItemId;
      const conflicts = store.relationships.filter((r) => r.type === "conflicts_with" && (r.fromId === id || r.toId === id));
      passed = conflicts.length > 0;
      actualSummary = passed
        ? `Ditandai berkonflik dengan ${conflicts.map((c) => (c.fromId === id ? c.toId : c.fromId)).join(", ")}.`
        : "Tidak ada penanda konflik.";
      break;
    }
    case "answer_with_citation":
    case "insufficient_evidence":
    case "no_restricted_leak": {
      const result = await ask(actor, testCase.question ?? "", "id", ai);
      const cited = [...result.answer.steps, ...result.answer.approvalBoundaries, ...result.answer.risks].flatMap((c) => c.citations);
      evidenceQuality = cited.length > 0 && result.invalidCitations === 0 ? "valid_citations" : "no_citations";
      if (testCase.expected === "answer_with_citation") {
        passed = !result.answer.insufficientEvidence && evidenceQuality === "valid_citations";
        actualSummary = `Sumber: ${result.sources.map((s) => s.id).join(", ") || "tidak ada"}.`;
      } else if (testCase.expected === "insufficient_evidence") {
        passed = result.answer.insufficientEvidence && result.sources.length === 0;
        actualSummary = result.answer.insufficientEvidence
          ? "Menyatakan bukti tidak cukup."
          : `Menjawab dengan sumber ${result.sources.map((s) => s.id).join(", ")}.`;
      } else {
        const leaked = result.sources.filter((s) => {
          if (s.kind !== "knowledge") return false;
          const item = store.items.find((i) => i.id === s.id);
          return !item || !canReadItem(actor, item, store.grants);
        });
        const unreadable = store.items.filter((i) => !canReadItem(actor, i, store.grants));
        const text = JSON.stringify(result.answer);
        const textLeak = unreadable.filter((i) => text.includes(i.title));
        passed = leaked.length === 0 && textLeak.length === 0;
        actualSummary = passed
          ? `Tidak ada kebocoran. Sumber dipakai: ${result.sources.map((s) => s.id).join(", ") || "tidak ada"}.`
          : `BOCOR: ${[...leaked.map((s) => s.id), ...textLeak.map((i) => i.id)].join(", ")}.`;
      }
      break;
    }
  }

  const run: EvaluationRun = {
    id: nextId(store, "V"),
    caseId: testCase.id,
    evaluatorId: evaluator.id,
    ranAt: nowIso(),
    actualSummary,
    evidenceQuality,
    passed,
  };
  store.evaluationRuns.push(run);
  recordAudit({
    actorId: evaluator.id,
    action: "evaluation.run",
    targetType: "evaluation",
    targetId: testCase.id,
    outcome: "info",
    meta: { passed },
  });
  return run;
}

export async function runAllCases(evaluator: Profile, ai?: AIProvider): Promise<EvaluationRun[]> {
  const runs: EvaluationRun[] = [];
  for (const c of getStore().evaluationCases) runs.push(await runCase(evaluator, c, ai));
  return runs;
}

export function latestRuns(): Map<string, EvaluationRun> {
  const map = new Map<string, EvaluationRun>();
  for (const run of getStore().evaluationRuns) map.set(run.caseId, run);
  return map;
}
