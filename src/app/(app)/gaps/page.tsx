import Link from "next/link";
import { redirect } from "next/navigation";
import type { KnowledgeItem } from "@/domain/types";
import { fmt, type Dictionary } from "@/i18n";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { gapReport, profileName } from "@/server/services/knowledge";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";

export const metadata = { title: "Celah pengetahuan" };

export default async function GapsPage() {
  const user = await requireUser();
  const report = gapReport(user);
  if (!report) redirect("/");
  const { t } = await getT();

  return (
    <div>
      <PageHeader title={t.gaps.title} intro={t.gaps.intro} />
      <div className="grid gap-6 md:grid-cols-2">
        <GapList title={t.gaps.noOwner} items={report.noOwner} t={t} />
        <GapList title={t.gaps.overdue} items={report.overdueReview} t={t} detail={(i) => i.reviewDueAt ?? ""} />
        <GapList title={t.gaps.missing} items={report.missingInfo} t={t} detail={(i) => i.missingInfo.join("; ")} />
        <section>
          <SectionTitle aside={report.singleContributorCategories.length}>{t.gaps.single}</SectionTitle>
          <ul className="card divide-y divide-line">
            {report.singleContributorCategories.length ? (
              report.singleContributorCategories.map((c) => (
                <li key={c.category} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <Link href={`/library?category=${c.category}`} className="text-ink hover:text-accent">
                    {t.category[c.category]}
                  </Link>
                  <span className="text-2xs text-ink-3">
                    {fmt(t.gaps.singleNote, { n: c.count })} · {profileName(c.contributorId)}
                  </span>
                </li>
              ))
            ) : (
              <li className="px-4 py-2.5 text-sm text-ink-3">{t.gaps.none}</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function GapList({
  title,
  items,
  t,
  detail,
}: {
  title: string;
  items: KnowledgeItem[];
  t: Dictionary;
  detail?: (i: KnowledgeItem) => string;
}) {
  return (
    <section>
      <SectionTitle aside={items.length}>{title}</SectionTitle>
      <ul className="card divide-y divide-line">
        {items.length ? (
          items.map((i) => (
            <li key={i.id}>
              <Link href={`/library/${i.id}`} className="block px-4 py-2.5 hover:bg-sunken/60">
                <span className="block truncate text-sm text-ink">{i.title}</span>
                {detail ? <span className="block truncate text-2xs text-ink-3">{detail(i)}</span> : null}
              </Link>
            </li>
          ))
        ) : (
          <li className="px-4 py-2.5 text-sm text-ink-3">{t.gaps.none}</li>
        )}
      </ul>
    </section>
  );
}
