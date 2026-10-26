import type { Dictionary } from "./id";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> };

/**
 * Japanese — structure only in Phase 1. Missing keys fall back to English.
 * Translations must be reviewed by a native speaker before release.
 */
export const ja: DeepPartial<Dictionary> = {
  nav: {
    home: "ホーム",
    ask: "DNIに質問",
    capture: "知識を共有",
    library: "ライブラリ",
    decisions: "意思決定",
    reviews: "レビュー",
  },
  status: {
    verified: "検証済み",
    approved_official: "正式承認",
    pending_review: "レビュー待ち",
  },
};
