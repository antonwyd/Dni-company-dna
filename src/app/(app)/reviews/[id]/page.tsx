import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck } from "lucide-react";
import type { ApprovalAction } from "@/domain/types";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getItemForUser } from "@/server/services/knowledge";
import { allowedActions } from "@/server/services/review";
import { reviewAction } from "../actions";
import {
  ConflictNotice,
  KnowledgeHeader,
  KnowledgeMeta,
  OriginalSources,
  StructuredContent,
} from "@/components/knowledge/knowledge-detail";
import { SubmitButton } from "@/components/ui/submit-button";

const VARIANT: Record<ApprovalAction, "primary" | "secondary" | "danger"> = {
  submit_for_review: "secondary",
  verify: "primary",
  approve_official: "primary",
  request_revision: "secondary",
  supersede: "danger",
  archive: "danger",
};

export default async function ReviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const user = await requireUser();
  const { t } = await getT();
  const { id } = await params;
  const { error, done } = await searchParams;
  const item = getItemForUser(user, id);
  if (!item) notFound();
  const actions = allowedActions(user, item);

  return (
    <div>
      <Link href="/reviews" className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink">
        <ArrowLeft aria-hidden className="size-3.5" />
        {t.reviews.title}
      </Link>
      <KnowledgeHeader item={item} t={t} />
      <ConflictNotice user={user} item={item} t={t} />

      {done ? (
        <p className="mb-6 inline-flex items-center gap-2 rounded-lg bg-ok-tint px-3 py-2 text-sm text-ok">
          <CircleCheck aria-hidden className="size-4" />
          {t.reviews.done}
        </p>
      ) : null}
      {error ? (
        <p className="mb-6 rounded-lg bg-shu-tint px-3 py-2 text-sm text-shu">
          {error === "self_review" ? t.reviews.selfReview : t.reviews.denied}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <OriginalSources item={item} t={t} />
        </div>
        <div>
          <StructuredContent item={item} t={t} />
        </div>
      </div>

      <section className="card mt-8 px-5 py-4">
        {actions.length ? (
          <form action={reviewAction} className="flex flex-col gap-3">
            <input type="hidden" name="itemId" value={item.id} />
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-2">{t.reviews.note}</span>
              <textarea name="note" rows={2} maxLength={1000} className="input resize-none" />
            </label>
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <SubmitButton key={a} name="action" value={a} variant={VARIANT[a]} size="sm">
                  {t.action[a]}
                </SubmitButton>
              ))}
            </div>
          </form>
        ) : (
          <p className="text-sm text-ink-3">{item.contributorId === user.id ? t.reviews.selfReview : t.reviews.noActions}</p>
        )}
      </section>

      <div className="mt-8 lg:max-w-sm">
        <KnowledgeMeta user={user} item={item} t={t} />
      </div>
    </div>
  );
}
