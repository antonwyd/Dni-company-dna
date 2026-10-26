import { Lock } from "lucide-react";
import type { Classification, KnowledgeStatus, KnowledgeType } from "@/domain/types";
import type { Dictionary } from "@/i18n";

const pill = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium whitespace-nowrap";

const STATUS_STYLE: Record<KnowledgeStatus, string> = {
  captured: "bg-sunken text-ink-2",
  ai_draft: "bg-sunken text-ink-2",
  pending_review: "bg-warn-tint text-warn",
  verified: "bg-ok-tint text-ok",
  approved_official: "bg-accent text-white",
  superseded: "bg-sunken text-ink-3 line-through",
  archived: "bg-sunken text-ink-3",
};

export function StatusBadge({ status, t }: { status: KnowledgeStatus; t: Dictionary }) {
  return <span className={`${pill} ${STATUS_STYLE[status]}`}>{t.status[status]}</span>;
}

/** Knowledge type is shown as a quiet outlined label so it never reads as a status. */
export function TypeBadge({ type, t }: { type: KnowledgeType; t: Dictionary }) {
  return <span className={`${pill} border border-line-strong text-ink-2`}>{t.type[type]}</span>;
}

export function ClassificationBadge({ value, t }: { value: Classification; t: Dictionary }) {
  if (value === "general_internal") return <span className={`${pill} text-ink-3`}>{t.classification[value]}</span>;
  const strong = value === "highly_confidential" || value === "confidential";
  return (
    <span className={`${pill} ${strong ? "bg-shu-tint text-shu" : "bg-sunken text-ink-2"}`}>
      <Lock aria-hidden className="size-3" />
      {t.classification[value]}
    </span>
  );
}

export function SyntheticBadge({ t }: { t: Dictionary }) {
  return <span className={`${pill} border border-dashed border-line-strong text-ink-3`}>{t.common.synthetic}</span>;
}
