import Link from "next/link";
import { Search } from "lucide-react";
import { CATEGORIES, KNOWLEDGE_STATUSES, KNOWLEDGE_TYPES, type Category, type KnowledgeStatus, type KnowledgeType } from "@/domain/types";
import { fmt } from "@/i18n";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { searchLibrary } from "@/server/services/knowledge";
import { KnowledgeRow } from "@/components/knowledge/knowledge-row";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { buttonClass } from "@/components/ui/button";

export const metadata = { title: "Perpustakaan" };

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; type?: string; status?: string }>;
}) {
  const user = await requireUser();
  const { t } = await getT();
  const sp = await searchParams;
  const filters = {
    q: sp.q?.slice(0, 200),
    category: pick<Category>(sp.category, CATEGORIES),
    type: pick<KnowledgeType>(sp.type, KNOWLEDGE_TYPES),
    status: pick<KnowledgeStatus>(sp.status, KNOWLEDGE_STATUSES),
  };
  const items = searchLibrary(user, filters);
  const filtered = Boolean(filters.q || filters.category || filters.type || filters.status);

  return (
    <div>
      <PageHeader title={t.library.title} />
      <form className="mb-5 flex flex-col gap-2 lg:flex-row" role="search">
        <label className="relative flex-1">
          <span className="sr-only">{t.library.search}</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
          <input name="q" defaultValue={filters.q} placeholder={t.library.search} className="input pl-9" />
        </label>
        <div className="grid grid-cols-3 gap-2 lg:flex">
          <FilterSelect
            name="category"
            label={t.capture.category}
            value={filters.category}
            all={t.library.all}
            options={CATEGORIES.map((c) => [c, t.category[c]])}
          />
          <FilterSelect
            name="type"
            label={t.capture.type}
            value={filters.type}
            all={t.library.all}
            options={KNOWLEDGE_TYPES.map((c) => [c, t.type[c]])}
          />
          <FilterSelect
            name="status"
            label="Status"
            value={filters.status}
            all={t.library.all}
            options={KNOWLEDGE_STATUSES.map((c) => [c, t.status[c]])}
          />
        </div>
        <div className="flex gap-2">
          <button className={buttonClass("primary", "md", "flex-1 lg:flex-none")}>{t.library.filter}</button>
          {filtered ? (
            <Link href="/library" className={buttonClass("ghost", "md")}>
              {t.library.reset}
            </Link>
          ) : null}
        </div>
      </form>

      <p className="mb-2 text-2xs text-ink-3">{fmt(t.library.results, { n: items.length })}</p>
      {items.length ? (
        <div className="card divide-y divide-line overflow-hidden">
          {items.map((item) => (
            <KnowledgeRow key={item.id} item={item} t={t} />
          ))}
        </div>
      ) : (
        <EmptyState>{t.library.empty}</EmptyState>
      )}
    </div>
  );
}

function FilterSelect({
  name,
  label,
  value,
  all,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  all: string;
  options: [string, string][];
}) {
  return (
    <label className="min-w-0">
      <span className="sr-only">{label}</span>
      <select name={name} defaultValue={value ?? ""} aria-label={label} className="input min-w-0 text-sm lg:w-44">
        <option value="">
          {label}: {all}
        </option>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
