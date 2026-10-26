import { redirect } from "next/navigation";
import { can } from "@/domain/permissions";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { profileName } from "@/server/services/knowledge";
import { awaitingOfficialApproval, pendingReviews } from "@/server/services/review";
import { KnowledgeRow } from "@/components/knowledge/knowledge-row";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui/page-header";

export const metadata = { title: "Review" };

export default async function ReviewsPage() {
  const user = await requireUser();
  if (!can(user, "review")) redirect("/");
  const { t } = await getT();
  const pending = pendingReviews(user);
  const official = awaitingOfficialApproval(user);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t.reviews.title} intro={t.reviews.intro} />
      <section>
        <SectionTitle aside={pending.length}>{t.reviews.pending}</SectionTitle>
        {pending.length ? (
          <div className="card divide-y divide-line overflow-hidden">
            {pending.map((item) => (
              <KnowledgeRow
                key={item.id}
                item={item}
                t={t}
                href={`/reviews/${item.id}`}
                meta={<span className="text-2xs text-ink-3">· {profileName(item.contributorId)}</span>}
              />
            ))}
          </div>
        ) : (
          <EmptyState>{t.reviews.empty}</EmptyState>
        )}
      </section>
      {official.length ? (
        <section>
          <SectionTitle aside={official.length}>{t.reviews.official}</SectionTitle>
          <div className="card divide-y divide-line overflow-hidden">
            {official.map((item) => (
              <KnowledgeRow key={item.id} item={item} t={t} href={`/reviews/${item.id}`} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
