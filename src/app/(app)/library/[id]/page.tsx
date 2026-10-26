import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getItemForUser } from "@/server/services/knowledge";
import { allowedActions } from "@/server/services/review";
import {
  ConflictNotice,
  KnowledgeHeader,
  KnowledgeMeta,
  NotOfficialNote,
  OriginalSources,
  StructuredContent,
} from "@/components/knowledge/knowledge-detail";
import { ButtonLink } from "@/components/ui/button";

export default async function KnowledgeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { t } = await getT();
  const { id } = await params;
  // Missing and forbidden look identical (404) so ids cannot be probed.
  const item = getItemForUser(user, id);
  if (!item) notFound();
  const canReview = allowedActions(user, item).length > 0;

  return (
    <div>
      <Link href="/library" className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink">
        <ArrowLeft aria-hidden className="size-3.5" />
        {t.library.title}
      </Link>
      <KnowledgeHeader item={item} t={t} />
      <ConflictNotice user={user} item={item} t={t} />
      <NotOfficialNote item={item} t={t} />
      {canReview ? (
        <div className="mb-6">
          <ButtonLink href={`/reviews/${item.id}`} variant="secondary" size="sm">
            {t.nav.reviews}
          </ButtonLink>
        </div>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <StructuredContent item={item} t={t} />
          <OriginalSources item={item} t={t} />
        </div>
        <KnowledgeMeta user={user} item={item} t={t} />
      </div>
    </div>
  );
}
