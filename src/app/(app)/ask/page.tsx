import Link from "next/link";
import { ArrowRight, Bot, ShieldQuestion, Sparkles } from "lucide-react";
import type { CitedText } from "@/server/ai/schemas";
import type { Dictionary } from "@/i18n";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { ask, type AskResult } from "@/server/services/ask";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Tanya DNI" };

const EXAMPLES = [
  "Apa pemeriksaan harian untuk Press Contoh-A?",
  "Apa yang harus disiapkan sebelum negosiasi harga dengan pelanggan Jepang?",
  "Mengapa beralih supplier baja lembaran?",
  "Berapa anggaran pelatihan tahun depan?",
];

export default async function AskPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const { t, locale } = await getT();
  const { q } = await searchParams;
  const question = q?.trim().slice(0, 1000) ?? "";
  const result = question ? await ask(user, question, locale === "en" ? "en" : "id") : null;

  return (
    <div>
      <PageHeader title={t.ask.title} intro={t.ask.intro} />
      <form className="card mb-8 flex items-end gap-2 p-2" role="search">
        <label htmlFor="q" className="sr-only">
          {t.ask.title}
        </label>
        <textarea
          id="q"
          name="q"
          rows={1}
          required
          maxLength={1000}
          defaultValue={question}
          placeholder={t.ask.placeholder}
          className="field-sizing-content block max-h-48 min-h-10 w-full resize-none border-0 bg-transparent px-2 py-2 text-[0.9375rem] placeholder:text-ink-3 focus:outline-none"
        />
        <SubmitButton pendingLabel={t.common.loading}>
          {t.ask.submit}
          <ArrowRight aria-hidden className="size-3.5" />
        </SubmitButton>
      </form>

      {result ? (
        <Answer result={result} t={t} />
      ) : (
        <section>
          <p className="eyebrow mb-2">{t.ask.examples}</p>
          <ul className="flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <li key={e}>
                <Link
                  href={`/ask?q=${encodeURIComponent(e)}`}
                  className="inline-block rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs text-ink-2 hover:text-ink"
                >
                  {e}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Answer({ result, t }: { result: AskResult; t: Dictionary }) {
  const { answer, sources } = result;
  const byRef = new Map(sources.map((s) => [s.ref, s]));
  const confidenceTone = {
    high: "bg-ok-tint text-ok",
    medium: "bg-accent-tint text-accent",
    low: "bg-warn-tint text-warn",
    none: "bg-shu-tint text-shu",
  }[answer.confidence];

  const cited = (list: CitedText[]) => (
    <ul className="flex flex-col gap-2.5">
      {list.map((c, i) => (
        <li key={i} className="flex flex-col gap-1">
          <p className="text-sm text-ink">{c.text}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-2xs text-ink-3">{t.evidence[c.label]}</span>
            {c.citations.map((ref) => {
              const s = byRef.get(ref);
              return s ? (
                <Link
                  key={ref}
                  href={s.kind === "decision" ? `/decisions/${s.id}` : `/library/${s.id}`}
                  className="tabular rounded bg-accent-tint px-1.5 py-px text-2xs font-semibold text-accent hover:bg-accent hover:text-white"
                >
                  {ref}
                </Link>
              ) : null;
            })}
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <article className="flex min-w-0 flex-col gap-6">
        <div className={`card px-5 py-4 ${answer.insufficientEvidence ? "border-shu/25" : ""}`}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {answer.insufficientEvidence ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-shu">
                <ShieldQuestion aria-hidden className="size-4" />
                {t.ask.insufficient}
              </span>
            ) : (
              <span className="eyebrow">{t.ask.summary}</span>
            )}
            <span className={`ml-auto rounded-full px-2 py-0.5 text-2xs font-medium ${confidenceTone}`}>
              {t.ask.confidence}: {t.confidence[answer.confidence]}
            </span>
          </div>
          <p className="text-[0.9375rem] text-ink">{answer.summary}</p>
        </div>

        {answer.steps.length ? (
          <section>
            <SectionTitle>{t.ask.steps}</SectionTitle>
            <div className="card px-5 py-4">{cited(answer.steps)}</div>
          </section>
        ) : null}

        {answer.approvalBoundaries.length ? (
          <section>
            <SectionTitle>{t.ask.approvals}</SectionTitle>
            <div className="card px-5 py-4">{cited(answer.approvalBoundaries)}</div>
          </section>
        ) : null}

        {answer.risks.length ? (
          <section>
            <SectionTitle>{t.ask.risks}</SectionTitle>
            <div className="card px-5 py-4">{cited(answer.risks)}</div>
          </section>
        ) : null}

        {answer.recommendations.length ? (
          <section className="rounded-[var(--radius-card)] border border-dashed border-accent/40 bg-accent-tint/50 px-5 py-4">
            <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
              <Sparkles aria-hidden className="size-3.5" />
              {t.ask.recommendations}
              <span className="font-normal text-ink-3">· {t.ask.recommendationNote}</span>
            </p>
            <ul className="flex flex-col gap-1.5 text-sm text-ink">
              {answer.recommendations.map((r, i) => (
                <li key={i}>{r.text}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {answer.missingInformation.length ? (
          <section className="rounded-lg bg-warn-tint/70 px-5 py-4">
            <p className="text-xs font-semibold text-warn">{t.ask.missing}</p>
            <ul className="mt-1 list-disc pl-4 text-sm text-ink-2">
              {answer.missingInformation.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>

      <aside className="flex flex-col gap-6">
        <section>
          <SectionTitle>{t.ask.sources}</SectionTitle>
          {sources.length ? (
            <ol className="card divide-y divide-line">
              {sources.map((s) => (
                <li key={s.ref}>
                  <Link
                    href={s.kind === "decision" ? `/decisions/${s.id}` : `/library/${s.id}`}
                    className="flex gap-3 px-4 py-2.5 hover:bg-sunken/60"
                  >
                    <span className="tabular mt-0.5 text-2xs font-semibold text-accent">{s.ref}</span>
                    <span className="min-w-0">
                      <span className="block text-sm text-ink">{s.title}</span>
                      <span className="block text-2xs text-ink-3">
                        {s.id} · {s.type === "decision" ? t.nav.decisions : t.type[s.type]}
                        {s.status === "historical_decision" ? "" : ` · ${t.status[s.status]}`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-ink-3">{t.common.none}</p>
          )}
        </section>

        {answer.departments.length ? (
          <section>
            <SectionTitle>{t.ask.departments}</SectionTitle>
            <p className="text-sm text-ink-2">
              {answer.departments.map((d) => (d in t.department ? t.department[d as keyof Dictionary["department"]] : d)).join(", ")}
            </p>
          </section>
        ) : null}

        <section>
          <SectionTitle>{t.ask.limitations}</SectionTitle>
          <ul className="flex flex-col gap-1.5 text-xs text-ink-2">
            {answer.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p className="mt-3 inline-flex items-center gap-1.5 text-2xs text-ink-3">
            <Bot aria-hidden className="size-3.5" />
            {t.ask.providerNote}
          </p>
        </section>
      </aside>
    </div>
  );
}
