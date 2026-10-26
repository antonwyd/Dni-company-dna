import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { KnowledgeItem } from "@/domain/types";
import type { Dictionary } from "@/i18n";
import { ClassificationBadge, StatusBadge, TypeBadge } from "@/components/ui/badges";

export function KnowledgeRow({ item, t, href, meta }: { item: KnowledgeItem; t: Dictionary; href?: string; meta?: React.ReactNode }) {
  return (
    <Link href={href ?? `/library/${item.id}`} className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-sunken/60">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="tabular text-2xs text-ink-3">{item.id}</span>
          <StatusBadge status={item.status} t={t} />
        </div>
        <p className="mt-1 truncate text-sm font-medium text-ink group-hover:text-accent">{item.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <TypeBadge type={item.type} t={t} />
          <ClassificationBadge value={item.classification} t={t} />
          <span className="text-2xs text-ink-3">{t.category[item.category]}</span>
          {meta}
        </div>
      </div>
      <ChevronRight aria-hidden className="mt-5 size-4 shrink-0 text-ink-3 group-hover:text-ink-2" />
    </Link>
  );
}
