import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getDecisionForUser, getItemForUser } from "@/server/services/knowledge";
import { ClassificationBadge, SyntheticBadge } from "@/components/ui/badges";

export default async function DecisionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { t } = await getT();
  const { id } = await params;
  const d = getDecisionForUser(user, id);
  if (!d) notFound();
  // Only references the user may read are shown.
  const references = d.referenceIds.map((ref) => getItemForUser(user, ref)).filter((i) => i !== null);

  const rows: [string, string | null][] = [
    [t.decisions.context, d.context],
    [t.decisions.problem, d.problem],
    [t.decisions.information, d.availableInformation],
    [t.decisions.decision, d.decision],
    [t.decisions.rationale, d.rationale],
    [t.decisions.risks, d.risks],
    [t.decisions.expected, d.expectedOutcome],
    [t.decisions.actual, d.actualOutcome],
    [t.decisions.lessons, d.lessonsLearned],
  ];

  return (
    <div className="max-w-4xl">
      <Link href="/decisions" className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink">
        <ArrowLeft aria-hidden className="size-3.5" />
        {t.decisions.title}
      </Link>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="tabular text-xs text-ink-3">{d.id}</span>
        <ClassificationBadge value={d.classification} t={t} />
        {d.synthetic ? <SyntheticBadge t={t} /> : null}
      </div>
      <h1 className="mt-2 text-[1.375rem] font-semibold tracking-tight text-ink">{d.title}</h1>
      <p className="mt-1 text-sm text-ink-2">
        {d.decidedOn} · {d.decisionMakerLabel}
      </p>
      <p className="mt-4 flex items-center gap-2 rounded-lg bg-sunken px-3 py-2 text-xs text-ink-2">
        <History aria-hidden className="size-3.5 shrink-0" />
        {t.decisions.intro}
      </p>

      <dl className="card mt-6 divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
            <dt className="text-xs font-medium text-ink-3">{label}</dt>
            <dd className={`text-sm ${value ? "text-ink" : "text-ink-3 italic"}`}>{value ?? t.decisions.notRecorded}</dd>
          </div>
        ))}
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
          <dt className="text-xs font-medium text-ink-3">{t.decisions.alternatives}</dt>
          <dd>
            <ul className="list-disc pl-4 text-sm text-ink">
              {d.alternatives.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>

      {d.missingInfo.length ? (
        <div className="mt-4 rounded-lg bg-warn-tint/70 px-4 py-3">
          <p className="text-xs font-semibold text-warn">{t.decisions.missing}</p>
          <ul className="mt-1 list-disc pl-4 text-sm text-ink-2">
            {d.missingInfo.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {references.length ? (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold">{t.decisions.references}</p>
          <ul className="flex flex-col gap-1">
            {references.map((r) => (
              <li key={r.id}>
                <Link href={`/library/${r.id}`} className="text-sm text-accent hover:underline">
                  {r.id} · {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
