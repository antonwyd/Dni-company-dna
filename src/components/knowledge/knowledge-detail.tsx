import Link from "next/link";
import { FileText, Info, TriangleAlert } from "lucide-react";
import type { KnowledgeItem } from "@/domain/types";
import { fmt, type Dictionary } from "@/i18n";
import { getStore } from "@/server/store/memory-store";
import { approvalsFor, profileName, relatedItems, sourcesFor, conflictsFor } from "@/server/services/knowledge";
import type { Profile } from "@/domain/types";
import { ClassificationBadge, StatusBadge, SyntheticBadge, TypeBadge } from "@/components/ui/badges";
import { SectionTitle } from "@/components/ui/page-header";

function date(iso: string | null) {
  return iso ? iso.slice(0, 10) : null;
}

export function KnowledgeHeader({ item, t }: { item: KnowledgeItem; t: Dictionary }) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="tabular text-xs text-ink-3">{item.id}</span>
        <StatusBadge status={item.status} t={t} />
        <TypeBadge type={item.type} t={t} />
        <ClassificationBadge value={item.classification} t={t} />
        {item.synthetic ? <SyntheticBadge t={t} /> : null}
      </div>
      <h1 className="mt-2 text-[1.375rem] font-semibold leading-snug tracking-tight text-ink">{item.title}</h1>
      <p className="mt-1.5 max-w-3xl text-sm text-ink-2">{item.summary}</p>
    </header>
  );
}

export function StructuredContent({ item, t }: { item: KnowledgeItem; t: Dictionary }) {
  return (
    <section>
      <SectionTitle>{t.library.structured}</SectionTitle>
      <dl className="card divide-y divide-line">
        {item.sections.map((s, i) => (
          <div key={`${s.key}-${i}`} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
            <dt className="text-xs font-medium text-ink-3">{t.gap[s.key]}</dt>
            <dd className="text-sm text-ink">{s.value}</dd>
          </div>
        ))}
      </dl>
      {item.missingInfo.length ? (
        <div className="mt-3 rounded-lg bg-warn-tint/70 px-4 py-3">
          <p className="text-xs font-semibold text-warn">{t.library.missing}</p>
          <ul className="mt-1 list-disc pl-4 text-sm text-ink-2">
            {item.missingInfo.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** Original sources, shown exactly as captured. Untrusted text is rendered as plain text only. */
export function OriginalSources({ item, t }: { item: KnowledgeItem; t: Dictionary }) {
  const sources = sourcesFor(item);
  const sessions = getStore().sessions;
  return (
    <section>
      <SectionTitle>{t.library.sources}</SectionTitle>
      <ul className="flex flex-col gap-2">
        {sources.map((s) => {
          const session = s.conversationId ? sessions.find((c) => c.id === s.conversationId) : undefined;
          return (
            <li key={s.id} className="card px-4 py-3">
              <div className="flex items-center gap-2 text-2xs text-ink-3">
                <FileText aria-hidden className="size-3.5" />
                <span className="tabular">{s.id}</span>
                <span>· {profileName(s.createdBy)}</span>
                <span className="tabular">· {date(s.createdAt)}</span>
              </div>
              <blockquote className="mt-2 border-l-2 border-line-strong pl-3 text-sm whitespace-pre-wrap text-ink-2">
                {s.originalText}
              </blockquote>
              {session ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-accent">{t.capture.conversation}</summary>
                  <ol className="mt-2 flex flex-col gap-1.5 text-sm">
                    {session.messages.map((m) => (
                      <li key={m.id} className={m.role === "assistant" ? "text-ink-3" : "text-ink"}>
                        <span className="mr-1.5 text-2xs font-semibold uppercase">
                          {m.role === "assistant" ? t.capture.assistant : profileName(session.contributorId)}
                        </span>
                        {m.text}
                      </li>
                    ))}
                  </ol>
                </details>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ConflictNotice({ user, item, t }: { user: Profile; item: KnowledgeItem; t: Dictionary }) {
  const conflicts = conflictsFor(user, item.id);
  if (!conflicts.length) return null;
  return (
    <div role="alert" className="mb-6 flex gap-3 rounded-lg border border-shu/25 bg-shu-tint px-4 py-3">
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-shu" />
      <div className="text-sm">
        <p className="font-semibold text-shu">{t.library.conflict}</p>
        <p className="mt-0.5 text-ink-2">{t.library.conflictBody}</p>
        <ul className="mt-1.5">
          {conflicts.map((c) => (
            <li key={c.relationship.id}>
              <Link href={`/library/${c.other.id}`} className="text-accent hover:underline">
                {c.other.id} · {c.other.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function NotOfficialNote({ item, t }: { item: KnowledgeItem; t: Dictionary }) {
  if (item.status === "approved_official") return null;
  return (
    <p className="mb-6 flex items-center gap-2 text-xs text-ink-3">
      <Info aria-hidden className="size-3.5" />
      {t.library.notOfficial}
    </p>
  );
}

export function KnowledgeMeta({ user, item, t }: { user: Profile; item: KnowledgeItem; t: Dictionary }) {
  const related = relatedItems(user, item.id).filter((r) => r.relationship.type !== "conflicts_with");
  const approvals = approvalsFor(item.id);
  const rows: [string, string][] = [
    [t.library.owner, profileName(item.ownerId) ?? t.library.noOwner],
    [t.library.contributor, profileName(item.contributorId) ?? t.common.none],
    [t.library.reviewer, profileName(item.reviewerId) ?? t.common.none],
    [t.capture.category, t.category[item.category]],
    [t.library.department, t.department[item.departmentId]],
    [t.library.updated, date(item.updatedAt) ?? t.common.none],
    [t.library.reviewDue, item.reviewDueAt ?? (item.type === "historical_record" ? t.library.noReviewDue : t.common.none)],
  ];
  return (
    <aside className="flex flex-col gap-6">
      <dl className="card divide-y divide-line text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-2">
            <dt className="text-ink-3">{k}</dt>
            <dd className={`text-right ${v === t.library.noOwner ? "text-shu" : "text-ink"}`}>{v}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 px-4 py-2">
          <dt className="text-ink-3">{t.library.versions}</dt>
          <dd className="text-ink">{fmt(t.library.version, { n: item.version })}</dd>
        </div>
        {item.tags.length ? (
          <div className="flex flex-wrap gap-1 px-4 py-2.5">
            {item.tags.map((tag) => (
              <Link
                key={tag}
                href={`/library?q=${encodeURIComponent(tag)}`}
                className="rounded-md bg-sunken px-1.5 py-0.5 text-2xs text-ink-2 hover:text-ink"
              >
                #{tag}
              </Link>
            ))}
          </div>
        ) : null}
      </dl>

      {related.length ? (
        <div>
          <SectionTitle>{t.library.related}</SectionTitle>
          <ul className="card divide-y divide-line">
            {related.map((r) => (
              <li key={r.relationship.id} className="px-4 py-2.5 text-sm">
                <span className="text-2xs text-ink-3">
                  {t.relationship[r.relationship.type]}
                  {r.relationship.verified ? "" : ` · ${t.library.unverifiedRelation}`}
                </span>
                <Link href={`/library/${r.other.id}`} className="block truncate text-accent hover:underline">
                  {r.other.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <SectionTitle>{t.library.history}</SectionTitle>
        {approvals.length ? (
          <ol className="relative ml-1.5 flex flex-col gap-3 border-l border-line pl-4">
            {approvals.map((a) => (
              <li key={a.id} className="text-sm">
                <span aria-hidden className="absolute -left-[4.5px] mt-1.5 size-2 rounded-full bg-line-strong" />
                <p className="text-ink">
                  {t.action[a.action]} <span className="text-ink-3">· {profileName(a.actorId)}</span>
                </p>
                <p className="tabular text-2xs text-ink-3">
                  {date(a.at)} · {t.status[a.fromStatus]} → {t.status[a.toStatus]}
                </p>
                {a.note ? <p className="mt-0.5 text-xs text-ink-2">“{a.note}”</p> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-ink-3">{t.common.none}</p>
        )}
      </div>
    </aside>
  );
}
