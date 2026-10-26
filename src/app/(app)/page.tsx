import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, LibraryBig, MessageSquareText } from "lucide-react";
import { can } from "@/domain/permissions";
import { fmt } from "@/i18n";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { listOwnSessions } from "@/server/services/capture";
import { homeMetrics } from "@/server/services/knowledge";
import { CaptureStartForm } from "@/components/knowledge/capture-start-form";
import { KnowledgeRow } from "@/components/knowledge/knowledge-row";
import { EmptyState, SectionTitle } from "@/components/ui/page-header";

export default async function HomePage() {
  const user = await requireUser();
  const { t } = await getT();
  const metrics = homeMetrics(user);
  const drafts = can(user, "capture")
    ? listOwnSessions(user)
        .filter((s) => s.status !== "submitted")
        .slice(0, 3)
    : [];

  const shortcuts = [
    { href: "/ask", icon: MessageSquareText, label: t.home.ask, hint: t.home.askHint, show: true },
    { href: "/library", icon: LibraryBig, label: t.home.search, hint: t.home.searchHint, show: true },
    {
      href: "/reviews",
      icon: ClipboardCheck,
      label: t.home.review,
      hint: metrics.pendingReviews === null ? "" : `${metrics.pendingReviews} · ${t.home.reviewHint}`,
      show: metrics.pendingReviews !== null,
    },
  ].filter((s) => s.show);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <p className="eyebrow">{fmt(t.home.hello, { name: user.name.split(" ")[0] ?? user.name })}</p>
        <h1 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem] sm:leading-tight">
          {t.home.greeting}
        </h1>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_17rem]">
          {can(user, "capture") ? <CaptureStartForm t={t} /> : null}
          <nav aria-label={t.home.greeting} className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {shortcuts.map(({ href, icon: Icon, label, hint }) => (
              <Link
                key={href}
                href={href}
                className="card group flex items-center gap-3 px-4 py-3 transition-colors hover:border-line-strong"
              >
                <Icon aria-hidden className="size-4 shrink-0 text-accent" strokeWidth={1.75} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{label}</span>
                  <span className="block truncate text-2xs text-ink-3">{hint}</span>
                </span>
                <ArrowUpRight aria-hidden className="size-3.5 text-ink-3 group-hover:text-ink" />
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {drafts.length ? (
        <section>
          <SectionTitle>{t.home.continueDraft}</SectionTitle>
          <ul className="grid gap-2 sm:grid-cols-3">
            {drafts.map((s) => (
              <li key={s.id}>
                <Link href={`/capture/${s.id}`} className="card block px-4 py-3 hover:border-line-strong">
                  <span className="tabular text-2xs text-ink-3">{s.id}</span>
                  <span className="mt-1 line-clamp-2 block text-sm text-ink">{s.messages[0]?.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <SectionTitle>{t.home.recent}</SectionTitle>
          {metrics.recent.length ? (
            <div className="card divide-y divide-line overflow-hidden">
              {metrics.recent.map((item) => (
                <KnowledgeRow key={item.id} item={item} t={t} />
              ))}
            </div>
          ) : (
            <EmptyState>{t.home.nothingRecent}</EmptyState>
          )}
        </div>

        <div className="flex flex-col gap-8">
          {metrics.pendingReviews !== null || metrics.criticalGaps !== null ? (
            <dl className="grid grid-cols-2 gap-2">
              {metrics.pendingReviews !== null ? (
                <Metric
                  href="/reviews"
                  label={t.home.pendingReviews}
                  value={metrics.pendingReviews}
                  tone={metrics.pendingReviews ? "warn" : "plain"}
                />
              ) : null}
              {metrics.criticalGaps !== null ? (
                <Metric
                  href="/gaps"
                  label={t.home.criticalGaps}
                  value={metrics.criticalGaps}
                  tone={metrics.criticalGaps ? "shu" : "plain"}
                />
              ) : null}
            </dl>
          ) : null}

          <div>
            <SectionTitle>{t.home.upcomingReviews}</SectionTitle>
            {metrics.upcomingReviews.length ? (
              <ul className="card divide-y divide-line">
                {metrics.upcomingReviews.map((item) => (
                  <li key={item.id}>
                    <Link href={`/library/${item.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-sunken/60">
                      <span className="truncate text-sm text-ink">{item.title}</span>
                      <span className="tabular shrink-0 text-2xs text-ink-3">{item.reviewDueAt}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>{t.home.nothingDue}</EmptyState>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ href, label, value, tone }: { href: string; label: string; value: number; tone: "warn" | "shu" | "plain" }) {
  const color = tone === "warn" ? "text-warn" : tone === "shu" ? "text-shu" : "text-ink";
  return (
    <Link href={href} className="card block px-4 py-3 hover:border-line-strong">
      <dt className="text-2xs text-ink-3">{label}</dt>
      <dd className={`tabular mt-1 text-2xl font-semibold ${color}`}>{value}</dd>
    </Link>
  );
}
