import type { AuditEvent } from "@/domain/types";
import { getStore, nextId, nowIso } from "@/server/store/memory-store";

/**
 * Append-only audit log. Events carry identifiers and short codes only,
 * never knowledge content, so the log itself does not leak restricted text.
 */
export function recordAudit(event: Omit<AuditEvent, "id" | "at" | "meta"> & { meta?: AuditEvent["meta"] }): AuditEvent {
  const store = getStore();
  const entry: AuditEvent = { id: nextId(store, "L", 6), at: nowIso(), meta: {}, ...event };
  store.audit.push(Object.freeze(entry));
  return entry;
}

export function listAudit(limit = 50): readonly AuditEvent[] {
  return getStore().audit.slice(-limit).reverse();
}
