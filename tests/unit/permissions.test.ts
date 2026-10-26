import { beforeEach, describe, expect, it } from "vitest";
import { can, canReadItem, checkApprovalAction } from "@/domain/permissions";
import type { KnowledgeItem, Profile } from "@/domain/types";
import { getStore, resetStore } from "@/server/store/memory-store";

const user = (id: string): Profile => getStore().profiles.find((p) => p.id === id)!;
const item = (id: string): KnowledgeItem => getStore().items.find((i) => i.id === id)!;
const readable = (u: string, i: string) => canReadItem(user(u), item(i), getStore().grants);

describe("draft access matrix", () => {
  beforeEach(() => resetStore());

  it("lets every active user read general internal knowledge", () => {
    expect(readable("u-tech", "K-0001")).toBe(true);
    expect(readable("u-admin", "K-0001")).toBe(true);
  });

  it("limits department restricted knowledge to the department and top management", () => {
    expect(readable("u-tech", "K-0002")).toBe(true);
    expect(readable("u-qa", "K-0002")).toBe(false);
    expect(readable("u-gm", "K-0002")).toBe(true);
  });

  it("does not open confidential knowledge to all management", () => {
    expect(readable("u-sales-head", "K-0004")).toBe(true);
    expect(readable("u-pd", "K-0004")).toBe(true);
    expect(readable("u-mt-head", "K-0004")).toBe(false);
    expect(readable("u-tech", "K-0004")).toBe(false);
  });

  it("opens highly confidential knowledge only by explicit grant or personal relation", () => {
    expect(readable("u-pd", "K-0006")).toBe(true); // grant
    expect(readable("u-gm", "K-0006")).toBe(true); // contributor and owner
    expect(readable("u-sales-head", "K-0006")).toBe(false);
    expect(readable("u-reviewer", "K-0006")).toBe(false);
  });

  it("blocks inactive users", () => {
    const tech = { ...user("u-tech"), active: false };
    expect(canReadItem(tech, item("K-0001"), getStore().grants)).toBe(false);
  });

  it("restricts navigation by capability", () => {
    expect(can(user("u-tech"), "review")).toBe(false);
    expect(can(user("u-tech"), "knowledge_gaps")).toBe(false);
    expect(can(user("u-reviewer"), "review")).toBe(true);
    expect(can(user("u-admin"), "administration")).toBe(true);
    expect(can(user("u-admin"), "capture")).toBe(false);
  });
});

describe("approval rules", () => {
  beforeEach(() => resetStore());
  const grants = () => getStore().grants;

  it("never lets an AI or system actor change status", () => {
    const result = checkApprovalAction({ kind: "ai", user: user("u-pd") }, "verify", item("K-0007"), grants());
    expect(result).toEqual({ ok: false, reason: "not_human" });
    const system = checkApprovalAction({ kind: "system", user: null }, "approve_official", item("K-0002"), grants());
    expect(system.ok).toBe(false);
  });

  it("forbids self review", () => {
    const tech = user("u-tech");
    expect(checkApprovalAction({ kind: "human", user: tech }, "verify", item("K-0007"), grants())).toEqual({
      ok: false,
      reason: "self_review",
    });
  });

  it("lets a reviewer verify pending knowledge", () => {
    expect(checkApprovalAction({ kind: "human", user: user("u-reviewer") }, "verify", item("K-0007"), grants()).ok).toBe(true);
  });

  it("keeps personal experience from becoming official policy", () => {
    const result = checkApprovalAction({ kind: "human", user: user("u-pd") }, "approve_official", item("K-0002"), grants());
    expect(result).toEqual({ ok: false, reason: "type_cannot_be_official" });
  });

  it("only lets top management approve directives as official", () => {
    expect(checkApprovalAction({ kind: "human", user: user("u-sales-head") }, "approve_official", item("K-0003"), grants())).toEqual({
      ok: false,
      reason: "self_review",
    });
    expect(checkApprovalAction({ kind: "human", user: user("u-pd") }, "approve_official", item("K-0003"), grants()).ok).toBe(true);
    expect(checkApprovalAction({ kind: "human", user: user("u-reviewer") }, "approve_official", item("K-0003"), grants())).toEqual({
      ok: false,
      reason: "cannot_read",
    });
  });

  it("rejects invalid transitions", () => {
    const result = checkApprovalAction({ kind: "human", user: user("u-reviewer") }, "verify", item("K-0001"), grants());
    expect(result).toEqual({ ok: false, reason: "invalid_transition" });
  });
});
