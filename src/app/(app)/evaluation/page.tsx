import { redirect } from "next/navigation";
import { Play } from "lucide-react";
import { can } from "@/domain/permissions";
import { fmt } from "@/i18n";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { latestRuns } from "@/server/services/evaluation";
import { profileName } from "@/server/services/knowledge";
import { getStore } from "@/server/store/memory-store";
import { runEvaluationAction } from "./actions";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Evaluation Center" };

export default async function EvaluationPage() {
  const user = await requireUser();
  if (!can(user, "evaluation")) redirect("/");
  const { t } = await getT();
  const cases = getStore().evaluationCases;
  const runs = latestRuns();
  const ran = cases.filter((c) => runs.has(c.id));
  const passed = ran.filter((c) => runs.get(c.id)?.passed).length;

  return (
    <div>
      <PageHeader
        title={t.evaluation.title}
        intro={t.evaluation.intro}
        actions={
          <form action={runEvaluationAction}>
            <SubmitButton pendingLabel={t.common.loading}>
              <Play aria-hidden className="size-3.5" />
              {t.evaluation.runAll}
            </SubmitButton>
          </form>
        }
      />
      <p
        className={`mb-4 rounded-lg px-3 py-2 text-sm ${ran.length ? (passed === ran.length ? "bg-ok-tint text-ok" : "bg-shu-tint text-shu") : "bg-sunken text-ink-2"}`}
      >
        {ran.length ? fmt(t.evaluation.summary, { passed, total: ran.length }) : t.evaluation.noRuns}
      </p>

      <ul className="flex flex-col gap-2">
        {cases.map((c) => {
          const run = runs.get(c.id);
          return (
            <li key={c.id} className="card grid gap-3 px-4 py-3 md:grid-cols-[1fr_1fr_auto] md:items-start">
              <div className="min-w-0">
                <p className="text-2xs text-ink-3">
                  <span className="tabular">{c.id}</span> · {c.category.replaceAll("_", " ")} · {profileName(c.actorId)}
                </p>
                <p className="mt-0.5 text-sm font-medium text-ink">{c.title}</p>
                <p className="mt-1 text-xs text-ink-2">
                  <span className="text-ink-3">{t.evaluation.expected}: </span>
                  {c.expectedBehavior}
                </p>
              </div>
              <div className="min-w-0 text-xs">
                <p className="text-ink-3">{t.evaluation.actual}</p>
                {run ? (
                  <>
                    <p className="mt-0.5 text-ink">{run.actualSummary}</p>
                    <p className="tabular mt-1 text-2xs text-ink-3">
                      {run.evidenceQuality.replaceAll("_", " ")} · {profileName(run.evaluatorId)} ·{" "}
                      {run.ranAt.slice(0, 16).replace("T", " ")} UTC
                    </p>
                  </>
                ) : (
                  <p className="mt-0.5 text-ink-3">{t.evaluation.notRun}</p>
                )}
              </div>
              <div className="flex items-center gap-2 md:flex-col md:items-end">
                {run ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${run.passed ? "bg-ok-tint text-ok" : "bg-shu-tint text-shu"}`}
                  >
                    {run.passed ? t.evaluation.pass : t.evaluation.fail}
                  </span>
                ) : null}
                <form action={runEvaluationAction}>
                  <input type="hidden" name="caseId" value={c.id} />
                  <SubmitButton variant="secondary" size="sm">
                    {t.evaluation.run}
                  </SubmitButton>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
