/**
 * In-memory data store for the Phase 0–1 prototype.
 *
 * Data lives only in the server process and is reset on restart. The shape of
 * each collection matches a planned Postgres table (docs/DATA_MODEL.md); the
 * services talk to this object only, so a Supabase-backed implementation of
 * the same `DataStore` interface can replace it in Phase 2.
 */
import type {
  AccessGrant,
  ApprovalEvent,
  AuditEvent,
  CaptureSession,
  Decision,
  EvaluationCase,
  EvaluationRun,
  KnowledgeItem,
  KnowledgeRelationship,
  KnowledgeSource,
  Profile,
} from "@/domain/types";
import {
  SEED_APPROVALS,
  SEED_DECISIONS,
  SEED_EVALUATION_CASES,
  SEED_GRANTS,
  SEED_ITEMS,
  SEED_PROFILES,
  SEED_RELATIONSHIPS,
  SEED_SOURCES,
} from "./seed";

export interface DataStore {
  profiles: Profile[];
  items: KnowledgeItem[];
  sources: KnowledgeSource[];
  relationships: KnowledgeRelationship[];
  approvals: ApprovalEvent[];
  grants: AccessGrant[];
  decisions: Decision[];
  sessions: CaptureSession[];
  audit: AuditEvent[];
  evaluationCases: EvaluationCase[];
  evaluationRuns: EvaluationRun[];
  counters: Record<string, number>;
}

function createSeededStore(): DataStore {
  // structuredClone keeps the seed constants immutable across resets.
  return structuredClone({
    profiles: SEED_PROFILES,
    items: SEED_ITEMS,
    sources: SEED_SOURCES,
    relationships: SEED_RELATIONSHIPS,
    approvals: SEED_APPROVALS,
    grants: SEED_GRANTS,
    decisions: SEED_DECISIONS,
    sessions: [],
    audit: [],
    evaluationCases: SEED_EVALUATION_CASES,
    evaluationRuns: [],
    counters: {
      K: SEED_ITEMS.length,
      S: SEED_SOURCES.length,
      C: 0,
      M: 0,
      Q: 0,
      A: SEED_APPROVALS.length,
      R: SEED_RELATIONSHIPS.length,
      L: 0,
      V: 0,
    },
  });
}

const globalForStore = globalThis as unknown as { __dniStore?: DataStore };

export function getStore(): DataStore {
  globalForStore.__dniStore ??= createSeededStore();
  return globalForStore.__dniStore;
}

/** Test helper: start from fresh seed data. */
export function resetStore(): DataStore {
  globalForStore.__dniStore = createSeededStore();
  return globalForStore.__dniStore;
}

export function nextId(store: DataStore, prefix: string, width = 4): string {
  const n = (store.counters[prefix] ?? 0) + 1;
  store.counters[prefix] = n;
  return `${prefix}-${String(n).padStart(width, "0")}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
