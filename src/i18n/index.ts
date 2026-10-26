import { en } from "./en";
import { id, type Dictionary } from "./id";
import { ja } from "./ja";

export const LOCALES = ["id", "en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "id";
/** Locales offered in the UI. Japanese is structured but not translated yet. */
export const SELECTABLE_LOCALES: readonly Locale[] = ["id", "en"];

function merge<T>(base: T, override: unknown): T {
  if (typeof base !== "object" || base === null || typeof override !== "object" || override === null) {
    return (override as T) ?? base;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    out[key] = merge((base as Record<string, unknown>)[key], value);
  }
  return out as T;
}

const dictionaries: Record<Locale, Dictionary> = { id, en, ja: merge(en, ja) };

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Replace {name} placeholders. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export type { Dictionary };
