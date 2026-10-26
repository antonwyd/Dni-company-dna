import { beforeEach, describe, expect, it } from "vitest";
import type { Profile } from "@/domain/types";
import { MockAIProvider } from "@/server/ai/mock-provider";
import {
  answerQuestion,
  CaptureError,
  finishQuestions,
  openQuestion,
  skipQuestion,
  startCapture,
  submitForReview,
} from "@/server/services/capture";
import { applyReviewAction } from "@/server/services/review";
import { getItemForUser } from "@/server/services/knowledge";
import { getStore, resetStore } from "@/server/store/memory-store";

const ai = new MockAIProvider();
const user = (id: string): Profile => getStore().profiles.find((p) => p.id === id)!;

async function start(statement = "Jika Mesin Contoh-3 macet, ganti bushing.") {
  return startCapture(
    user("u-tech"),
    { statement, type: "personal_experience", category: "maintenance", classification: "general_internal", language: "id" },
    ai,
  );
}

describe("knowledge capture (MVP tests 1–5)", () => {
  beforeEach(() => resetStore());

  it("TEST 1: saves the original statement as a source and creates a draft", async () => {
    const session = await start();
    const store = getStore();
    const source = store.sources.find((s) => s.id === session.sourceId);
    expect(source?.originalText).toBe("Jika Mesin Contoh-3 macet, ganti bushing.");
    const item = store.items.find((i) => i.id === session.knowledgeItemId);
    expect(item?.status).toBe("ai_draft");
    expect(item?.sourceIds).toContain(session.sourceId);
  });

  it("TEST 2: asks one relevant question at a time, starting with the unknown term", async () => {
    const session = await start();
    const asked = session.questions.filter((q) => q.state === "asked");
    expect(asked).toHaveLength(1);
    expect(asked[0]!.gap).toBe("terminology");
    expect(asked[0]!.text).toContain("bushing");
    expect(asked[0]!.text).toMatch(/tidak tahu/); // states what it does not know about the company
  });

  it("asks about the specific machine part for context", async () => {
    const session = await start();
    await skipQuestion(user("u-tech"), session.id, ai);
    expect(openQuestion(session)?.gap).toBe("context");
    expect(openQuestion(session)?.text).toContain("Mesin Contoh-3");
  });

  it("TEST 3: answering updates the draft without losing prior information", async () => {
    const session = await start();
    await answerQuestion(user("u-tech"), session.id, "Bushing perunggu, nomor part contoh BX-12.", ai);
    const item = getStore().items.find((i) => i.id === session.knowledgeItemId)!;
    const values = item.sections.map((s) => s.value);
    expect(values).toContain("Jika Mesin Contoh-3 macet, ganti bushing.");
    expect(values).toContain("Bushing perunggu, nomor part contoh BX-12.");
  });

  it("never asks the same gap twice and stops when enough is known", async () => {
    const session = await start();
    for (let i = 0; i < 10 && session.status === "in_progress"; i++) {
      await skipQuestion(user("u-tech"), session.id, ai);
    }
    const gaps = session.questions.map((q) => q.gap);
    expect(new Set(gaps).size).toBe(gaps.length);
    expect(session.status).toBe("ready_for_confirmation");
    expect(session.questions.length).toBeLessThanOrEqual(5);
  });

  it("stops immediately when the contributor says enough, and records what is missing", async () => {
    const session = await start();
    await finishQuestions(user("u-tech"), session.id, ai);
    expect(session.status).toBe("ready_for_confirmation");
    const item = getStore().items.find((i) => i.id === session.knowledgeItemId)!;
    expect(item.missingInfo.length).toBeGreaterThan(0);
  });

  it("does not invent details: every draft section is the contributor's own text", async () => {
    const session = await start();
    await answerQuestion(user("u-tech"), session.id, "Di bagian poros utama.", ai);
    const item = getStore().items.find((i) => i.id === session.knowledgeItemId)!;
    const contributorTexts = session.messages.filter((m) => m.role === "contributor").map((m) => m.text);
    for (const section of item.sections) expect(contributorTexts).toContain(section.value);
  });

  it("hides another contributor's session", async () => {
    const session = await start();
    await expect(answerQuestion(user("u-qa"), session.id, "x", ai)).rejects.toBeInstanceOf(CaptureError);
  });

  it("TEST 4–5: reviewer sees original and draft, then validates", async () => {
    const session = await start();
    await finishQuestions(user("u-tech"), session.id, ai);
    const submitted = submitForReview(user("u-tech"), session.id);
    expect(submitted.status).toBe("pending_review");

    const reviewer = user("u-reviewer");
    const visible = getItemForUser(reviewer, submitted.id);
    expect(visible).not.toBeNull();
    expect(getStore().sources.find((s) => s.id === submitted.sourceIds[0])?.originalText).toContain("bushing");

    expect(applyReviewAction({ kind: "human", user: user("u-tech") }, submitted.id, "verify", "").ok).toBe(false);
    expect(applyReviewAction({ kind: "ai", user: reviewer }, submitted.id, "verify", "").ok).toBe(false);
    const result = applyReviewAction({ kind: "human", user: reviewer }, submitted.id, "verify", "OK");
    expect(result.ok && result.item.status).toBe("verified");
  });
});

describe("conflict detection", () => {
  beforeEach(() => resetStore());

  async function submit(statement: string) {
    const session = await startCapture(
      user("u-tech"),
      { statement, type: "personal_experience", category: "maintenance", classification: "general_internal", language: "id" },
      ai,
    );
    await finishQuestions(user("u-tech"), session.id, ai);
    return submitForReview(user("u-tech"), session.id);
  }

  const conflictsOf = (id: string) => getStore().relationships.filter((r) => r.type === "conflicts_with" && r.fromId === id);

  it("flags a statement that contradicts verified knowledge on the same topic", async () => {
    const item = await submit("Pelumasan rel Press Contoh-A cukup setiap 10 jam operasi.");
    expect(conflictsOf(item.id).map((r) => r.toId)).toEqual(["K-0001"]);
    expect(conflictsOf(item.id)[0]!.verified).toBe(false);
  });

  it("does not flag unrelated knowledge that merely shares a few words", async () => {
    const item = await submit("Jika Mesin Contoh-3 macet, ganti bushing-nya. Bunyi berdecit saat start.");
    expect(conflictsOf(item.id)).toEqual([]);
  });
});
