import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { CATEGORIES, CLASSIFICATIONS, KNOWLEDGE_TYPES, LANGUAGES } from "@/domain/types";
import type { Dictionary } from "@/i18n";
import { startCaptureAction } from "@/app/(app)/capture/actions";
import { SubmitButton } from "@/components/ui/submit-button";

const LANGUAGE_NAMES = { id: "Bahasa Indonesia", en: "English", ja: "日本語" } as const;

/**
 * One sentence is enough to start. Type, category and confidentiality are
 * tucked behind a disclosure with safe defaults.
 */
export function CaptureStartForm({ t, compact = false }: { t: Dictionary; compact?: boolean }) {
  return (
    <form action={startCaptureAction} className="card overflow-hidden">
      <label htmlFor="statement" className="sr-only">
        {t.capture.title}
      </label>
      <textarea
        id="statement"
        name="statement"
        required
        maxLength={4000}
        rows={compact ? 2 : 3}
        placeholder={t.capture.placeholder}
        className="block w-full resize-none border-0 bg-transparent px-4 pt-4 pb-2 text-[0.9375rem] text-ink placeholder:text-ink-3 focus:outline-none"
      />
      <details className="group border-t border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-xs text-ink-2 hover:bg-sunken/60 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5">
            <SlidersHorizontal aria-hidden className="size-3.5" />
            {t.capture.options}
          </span>
          <span className="text-ink-3">
            {t.type.personal_experience} · {t.classification.department_restricted}
          </span>
        </summary>
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
          <Select
            name="type"
            label={t.capture.type}
            defaultValue="personal_experience"
            options={KNOWLEDGE_TYPES.map((v) => [v, t.type[v]])}
          />
          <Select
            name="classification"
            label={t.capture.classification}
            defaultValue="department_restricted"
            options={CLASSIFICATIONS.map((v) => [v, t.classification[v]])}
          />
          <Select
            name="category"
            label={t.capture.category}
            defaultValue=""
            options={[["", t.capture.categoryAuto], ...CATEGORIES.map((v) => [v, t.category[v]] as [string, string])]}
          />
          <Select name="language" label={t.capture.language} defaultValue="id" options={LANGUAGES.map((v) => [v, LANGUAGE_NAMES[v]])} />
        </div>
      </details>
      <div className="flex items-center justify-between gap-3 border-t border-line bg-sunken/40 px-4 py-2.5">
        <p className="text-2xs text-ink-3">{t.capture.footerHint}</p>
        <SubmitButton size="sm" pendingLabel={t.common.loading}>
          {t.capture.start}
          <ArrowRight aria-hidden className="size-3.5" />
        </SubmitButton>
      </div>
    </form>
  );
}

function Select({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: [string, string][];
  defaultValue: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-2xs font-medium text-ink-2">{label}</span>
      <select name={name} defaultValue={defaultValue} className="input py-1.5 text-sm">
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
