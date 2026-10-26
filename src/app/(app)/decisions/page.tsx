import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { readableDecisions } from "@/server/services/knowledge";
import { ClassificationBadge } from "@/components/ui/badges";
import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Keputusan" };

export default async function DecisionsPage() {
  const user = await requireUser();
  const { t } = await getT();
  const decisions = readableDecisions(user);

  return (
    <div>
      <PageHeader title={t.decisions.title} intro={t.decisions.intro} />
      {decisions.length ? (
        <ul className="card divide-y divide-line overflow-hidden">
          {decisions.map((d) => (
            <li key={d.id}>
              <Link href={`/decisions/${d.id}`} className="group flex items-center gap-4 px-4 py-3.5 hover:bg-sunken/60">
                <span className="tabular w-20 shrink-0 text-xs text-ink-3">{d.decidedOn.slice(0, 7)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink group-hover:text-accent">{d.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-2xs text-ink-3">{d.decisionMakerLabel}</span>
                    <ClassificationBadge value={d.classification} t={t} />
                    {d.missingInfo.length ? (
                      <span className="text-2xs text-warn">
                        · {d.missingInfo.length} {t.decisions.missing.toLowerCase()}
                      </span>
                    ) : null}
                  </span>
                </span>
                <ChevronRight aria-hidden className="size-4 text-ink-3" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState>{t.decisions.empty}</EmptyState>
      )}
    </div>
  );
}
