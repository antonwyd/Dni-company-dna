import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck, CloudCheck, CornerDownLeft, FastForward, Square } from "lucide-react";
import type { CaptureSession, KnowledgeItem } from "@/domain/types";
import type { Dictionary } from "@/i18n";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { draftItemFor, getOwnSession, openQuestion } from "@/server/services/capture";
import { answerAction, finishAction, skipAction, submitAction } from "../actions";
import { ClassificationBadge, StatusBadge, TypeBadge } from "@/components/ui/badges";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Sesi pengetahuan" };

export default async function CaptureSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { t } = await getT();
  const { id } = await params;
  const { error } = await searchParams;
  const session = getOwnSession(user, id);
  if (!session) notFound();
  const item = draftItemFor(session);
  if (!item) notFound();
  const question = openQuestion(session);

  return (
    <div>
      <Link href="/capture" className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink">
        <ArrowLeft aria-hidden className="size-3.5" />
        {t.capture.title}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section aria-label={t.capture.conversation} className="flex min-w-0 flex-col gap-4">
          <Conversation session={session} t={t} />

          {session.status === "submitted" ? (
            <div className="card flex gap-3 border-ok/30 bg-ok-tint px-4 py-4">
              <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-ok" />
              <div>
                <p className="text-sm font-semibold text-ok">{t.capture.submitted}</p>
                <p className="mt-1 text-sm text-ink-2">{t.capture.submittedBody}</p>
                <ButtonLink href={`/library/${item.id}`} variant="secondary" size="sm" className="mt-3">
                  {t.capture.view} {item.id}
                </ButtonLink>
              </div>
            </div>
          ) : (
            <>
              {session.status === "ready_for_confirmation" ? (
                <div className="card border-accent/25 px-4 py-4">
                  <p className="text-sm font-semibold text-ink">{t.capture.readyTitle}</p>
                  <p className="mt-1 text-sm text-ink-2">{t.capture.readyBody}</p>
                  <form action={submitAction} className="mt-3">
                    <input type="hidden" name="sessionId" value={session.id} />
                    <SubmitButton pendingLabel={t.common.loading}>{t.capture.submit}</SubmitButton>
                  </form>
                </div>
              ) : null}

              <form action={answerAction} className="card overflow-hidden">
                <input type="hidden" name="sessionId" value={session.id} />
                <label htmlFor="answer" className="sr-only">
                  {t.capture.yourAnswer}
                </label>
                <textarea
                  id="answer"
                  name="answer"
                  rows={2}
                  required
                  maxLength={4000}
                  autoFocus
                  placeholder={question ? t.capture.yourAnswer : t.capture.addMore}
                  className="block w-full resize-none border-0 bg-transparent px-4 pt-3.5 pb-2 text-[0.9375rem] placeholder:text-ink-3 focus:outline-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-sunken/40 px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {question ? (
                      <>
                        <SubmitButton formAction={skipAction} formNoValidate variant="ghost" size="sm">
                          <FastForward aria-hidden className="size-3.5" />
                          {t.capture.skip}
                        </SubmitButton>
                        <SubmitButton formAction={finishAction} formNoValidate variant="ghost" size="sm">
                          <Square aria-hidden className="size-3" />
                          {t.capture.enough}
                        </SubmitButton>
                      </>
                    ) : null}
                  </div>
                  <SubmitButton size="sm" pendingLabel={t.common.loading}>
                    {t.capture.send}
                    <CornerDownLeft aria-hidden className="size-3.5" />
                  </SubmitButton>
                </div>
              </form>
              {error ? <p className="text-sm text-shu">{error === "empty" ? t.capture.errorEmpty : t.reviews.denied}</p> : null}
            </>
          )}
        </section>

        <DraftPanel item={item} session={session} t={t} />
      </div>
    </div>
  );
}

function Conversation({ session, t }: { session: CaptureSession; t: Dictionary }) {
  const questions = new Map(session.questions.map((q) => [q.id, q]));
  return (
    <ol className="flex flex-col gap-3">
      {session.messages.map((m) => {
        if (m.role === "assistant") {
          const q = m.questionId ? questions.get(m.questionId) : undefined;
          return (
            <li key={m.id} className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-tint text-2xs font-bold text-accent"
              >
                DNI
              </span>
              <div className="min-w-0 max-w-[40rem]">
                <p className="text-2xs text-ink-3">
                  {t.capture.assistant}
                  {q ? ` · ${t.gap[q.gap]}` : ""}
                  {q?.state === "skipped" ? ` · ${t.capture.skipped}` : ""}
                </p>
                <p className={`mt-0.5 text-[0.9375rem] ${q?.state === "skipped" ? "text-ink-3" : "text-ink"}`}>{m.text}</p>
              </div>
            </li>
          );
        }
        return (
          <li key={m.id} className="flex justify-end">
            <div className="max-w-[40rem] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[0.9375rem] text-paper">{m.text}</div>
          </li>
        );
      })}
    </ol>
  );
}

function DraftPanel({ item, session, t }: { item: KnowledgeItem; session: CaptureSession; t: Dictionary }) {
  const waiting = session.questions.filter((q) => q.state === "asked");
  return (
    <aside aria-label={t.capture.draft} className="card lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <p className="eyebrow">{t.capture.draft}</p>
        <span className="inline-flex items-center gap-1 text-2xs text-ok">
          <CloudCheck aria-hidden className="size-3.5" />
          {t.capture.saved}
        </span>
      </div>
      <div className="flex flex-col gap-4 px-4 py-4">
        <div>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={item.status} t={t} />
            <TypeBadge type={item.type} t={t} />
            <ClassificationBadge value={item.classification} t={t} />
          </div>
          <h2 className="mt-2 text-base font-semibold leading-snug text-ink">{item.title}</h2>
          <p className="mt-1 text-2xs text-ink-3">{t.capture.draftHint}</p>
        </div>

        <dl className="flex flex-col gap-3">
          {item.sections.map((s, i) => (
            <div key={`${s.key}-${i}`}>
              <dt className="text-2xs font-medium text-ink-3">{t.gap[s.key]}</dt>
              <dd className="mt-0.5 text-sm text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>

        <div className="rounded-lg bg-warn-tint/70 px-3 py-2.5">
          <p className="text-2xs font-semibold text-warn">{t.capture.missing}</p>
          {item.missingInfo.length || waiting.length ? (
            <ul className="mt-1 list-disc pl-4 text-xs text-ink-2">
              {item.missingInfo.map((m) => (
                <li key={m}>{m}</li>
              ))}
              {waiting.map((q) => (
                <li key={q.id}>
                  {t.gap[q.gap]} · {t.capture.awaitingAnswer}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-ink-2">{t.capture.nothingMissing}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
