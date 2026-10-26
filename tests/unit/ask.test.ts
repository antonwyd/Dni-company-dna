import { beforeEach, describe, expect, it } from "vitest";
import type { Profile } from "@/domain/types";
import { MockAIProvider } from "@/server/ai/mock-provider";
import type { AIProvider } from "@/server/ai/provider";
import { ask } from "@/server/services/ask";
import { runAllCases } from "@/server/services/evaluation";
import { getItemForUser, searchLibrary } from "@/server/services/knowledge";
import { getStore, resetStore } from "@/server/store/memory-store";

const ai = new MockAIProvider();
const user = (id: string): Profile => getStore().profiles.find((p) => p.id === id)!;

describe("Ask DNI retrieval (MVP tests 6, 7, 9)", () => {
  beforeEach(() => resetStore());

  it("TEST 6: answers a permitted user with its sources", async () => {
    const result = await ask(user("u-tech"), "Apa pemeriksaan harian untuk Press Contoh-A?", "id", ai);
    expect(result.answer.insufficientEvidence).toBe(false);
    expect(result.sources.map((s) => s.id)).toContain("K-0001");
    expect(result.answer.steps.some((s) => s.citations.length > 0)).toBe(true);
    expect(result.answer.confidence).toBe("high");
  });

  it("TEST 7: restricted knowledge never reaches the model for an unauthorized user", async () => {
    const seen: string[] = [];
    const spy: AIProvider = {
      name: "spy",
      external: false,
      nextClarification: ai.nextClarification.bind(ai),
      structureDraft: ai.structureDraft.bind(ai),
      answer: async (input) => {
        seen.push(...input.sources.map((s) => s.id));
        return ai.answer(input);
      },
    };
    await ask(user("u-tech"), "Berapa batas diskon harga dan siapa yang menyetujui negosiasi?", "id", spy);
    expect(seen).not.toContain("K-0003");
    expect(seen).not.toContain("K-0004");
    expect(seen).not.toContain("D-0002");
  });

  it("TEST 7: restricted knowledge is blocked through search and direct id", () => {
    const tech = user("u-tech");
    expect(searchLibrary(tech, { q: "diskon" }).map((i) => i.id)).not.toContain("K-0004");
    expect(getItemForUser(tech, "K-0004")).toBeNull();
    expect(getItemForUser(tech, "K-9999")).toBeNull();
    const denied = getStore().audit.filter((a) => a.outcome === "denied" && a.targetId === "K-0004");
    expect(denied).toHaveLength(1);
  });

  it("TEST 9: an unsupported question does not invent policy", async () => {
    const result = await ask(user("u-tech"), "Berapa anggaran pelatihan tahun depan?", "id", ai);
    expect(result.answer.insufficientEvidence).toBe(true);
    expect(result.sources).toHaveLength(0);
    expect(result.answer.steps).toHaveLength(0);
    expect(result.answer.confidence).toBe("none");
  });

  it("uses only reviewed knowledge, never pending drafts", async () => {
    const result = await ask(user("u-mt-head"), "pelumasan rel Press Contoh-A 12 jam", "id", ai);
    expect(result.sources.map((s) => s.id)).not.toContain("K-0007");
  });

  it("removes citations to sources that were not provided", async () => {
    const liar: AIProvider = {
      ...ai,
      name: "liar",
      external: false,
      nextClarification: ai.nextClarification.bind(ai),
      structureDraft: ai.structureDraft.bind(ai),
      answer: async (input) => {
        const out = await ai.answer(input);
        return { ...out, steps: out.steps.map((s) => ({ ...s, citations: [...s.citations, "S99"] })) };
      },
    };
    const result = await ask(user("u-tech"), "Apa pemeriksaan harian untuk Press Contoh-A?", "id", liar);
    expect(result.invalidCitations).toBeGreaterThan(0);
    expect(result.answer.steps.flatMap((s) => s.citations)).not.toContain("S99");
  });

  it("labels historical decisions as historical, not as current instructions", async () => {
    const result = await ask(user("u-pd"), "Mengapa beralih supplier baja lembaran?", "id", ai);
    expect(result.sources.some((s) => s.kind === "decision")).toBe(true);
    expect(result.answer.limitations.join(" ")).toMatch(/historis/);
  });
});

describe("Evaluation Center", () => {
  beforeEach(() => resetStore());

  it("runs every seeded case and records actual results", async () => {
    const runs = await runAllCases(user("u-reviewer"), ai);
    expect(runs).toHaveLength(getStore().evaluationCases.length);
    const failed = runs.filter((r) => !r.passed).map((r) => `${r.caseId}: ${r.actualSummary}`);
    expect(failed).toEqual([]);
  });

  it("refuses evaluators without permission", async () => {
    await expect(runAllCases(user("u-tech"), ai)).rejects.toThrow();
  });
});
