import Link from "next/link";
import { redirect } from "next/navigation";
import { can } from "@/domain/permissions";
import { fmt } from "@/i18n";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { draftItemFor, listOwnSessions } from "@/server/services/capture";
import { CaptureStartForm } from "@/components/knowledge/capture-start-form";
import { StatusBadge } from "@/components/ui/badges";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui/page-header";

export const metadata = { title: "Bagikan pengetahuan" };

export default async function CapturePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  if (!can(user, "capture")) redirect("/");
  const { t } = await getT();
  const { error } = await searchParams;
  const sessions = listOwnSessions(user);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <PageHeader title={t.capture.title} intro={t.capture.intro} />
        {error ? <p className="mb-3 text-sm text-shu">{t.capture.errorEmpty}</p> : null}
        <div className="max-w-3xl">
          <CaptureStartForm t={t} />
        </div>
      </div>

      <section className="max-w-3xl">
        <SectionTitle>{t.capture.sessions}</SectionTitle>
        {sessions.length ? (
          <ul className="card divide-y divide-line overflow-hidden">
            {sessions.map((s) => {
              const item = draftItemFor(s);
              return (
                <li key={s.id}>
                  <Link href={`/capture/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sunken/60">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="tabular text-2xs text-ink-3">{s.id}</span>
                        {item ? <StatusBadge status={item.status} t={t} /> : null}
                        <span className="text-2xs text-ink-3">{fmt(t.capture.questionsAsked, { n: s.questions.length })}</span>
                      </div>
                      <p className="mt-1 truncate text-sm text-ink">{s.messages[0]?.text}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-accent">
                      {s.status === "submitted" ? t.capture.view : t.capture.resume}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState>{t.capture.noSessions}</EmptyState>
        )}
      </section>
    </div>
  );
}
