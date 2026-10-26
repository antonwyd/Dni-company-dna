/**
 * DRAFT access and approval matrix.
 *
 * This encodes the default rules proposed in docs/ACCESS_MATRIX.md. They are a
 * starting point for the prototype only and are NOT official company policy
 * until approved by PT Takai Seiki Indonesia management.
 *
 * All functions are pure so they can be unit tested and later mirrored 1:1 in
 * Supabase Row Level Security policies.
 */
import type {
  AccessGrant,
  ApprovalAction,
  Classification,
  Decision,
  DepartmentId,
  KnowledgeItem,
  KnowledgeStatus,
  KnowledgeType,
  Profile,
  Role,
} from "./types";

export function hasRole(user: Profile, role: Role): boolean {
  return user.roles.includes(role);
}

function isDepartmentHeadOf(user: Profile, departmentId: DepartmentId): boolean {
  return hasRole(user, "department_head") && user.departmentId === departmentId;
}

function hasGrant(user: Profile, itemId: string, grants: readonly AccessGrant[]): boolean {
  return grants.some((g) => g.itemId === itemId && g.userId === user.id);
}

/**
 * Can this user read a record with the given classification and department?
 * Personal relationships to the record (contributor, owner, assigned reviewer,
 * explicit grant) are checked by the caller-specific helpers below.
 */
export function classificationAllows(user: Profile, classification: Classification, departmentId: DepartmentId): boolean {
  if (!user.active) return false;
  switch (classification) {
    case "general_internal":
      return true;
    case "department_restricted":
      return user.departmentId === departmentId || hasRole(user, "president_director") || hasRole(user, "general_manager");
    case "confidential":
      // Management is NOT assumed to see every confidential record:
      // only the head of the owning department and the President Director.
      return isDepartmentHeadOf(user, departmentId) || hasRole(user, "president_director");
    case "highly_confidential":
      // Explicit grant only (checked by canReadItem).
      return false;
  }
}

export function canReadItem(
  user: Profile,
  item: Pick<KnowledgeItem, "id" | "classification" | "departmentId" | "contributorId" | "ownerId" | "reviewerId">,
  grants: readonly AccessGrant[],
): boolean {
  if (!user.active) return false;
  if (item.contributorId === user.id || item.ownerId === user.id || item.reviewerId === user.id) return true;
  if (hasGrant(user, item.id, grants)) return true;
  return classificationAllows(user, item.classification, item.departmentId);
}

export function canReadDecision(user: Profile, decision: Pick<Decision, "classification" | "departmentId" | "decisionMakerId">): boolean {
  if (!user.active) return false;
  if (decision.decisionMakerId === user.id) return true;
  return classificationAllows(user, decision.classification, decision.departmentId);
}

/** Navigation and module-level permissions. */
export type Capability = "capture" | "ask" | "library" | "decisions" | "review" | "knowledge_gaps" | "evaluation" | "administration";

export function can(user: Profile, capability: Capability): boolean {
  if (!user.active) return false;
  const management = hasRole(user, "president_director") || hasRole(user, "general_manager");
  switch (capability) {
    case "capture":
      // A pure system administrator manages the platform, not its content.
      return !(user.roles.length === 1 && hasRole(user, "admin"));
    case "ask":
    case "library":
    case "decisions":
      return true;
    case "review":
      return hasRole(user, "reviewer") || hasRole(user, "department_head") || management;
    case "knowledge_gaps":
      // Dependency information is restricted to authorized management (PRD 2.10).
      return management || hasRole(user, "department_head");
    case "evaluation":
      return hasRole(user, "admin") || hasRole(user, "reviewer") || management;
    case "administration":
      return hasRole(user, "admin");
  }
}

/** Types that may ever become "Approved Official". Experience and history stay at "Verified". */
const OFFICIAL_TYPES: readonly KnowledgeType[] = ["approved_policy", "technical_standard", "management_directive"];

export function canBecomeOfficial(type: KnowledgeType): boolean {
  return OFFICIAL_TYPES.includes(type);
}

/** Allowed status transitions per action. */
export const TRANSITIONS: Record<ApprovalAction, { from: readonly KnowledgeStatus[]; to: KnowledgeStatus }> = {
  submit_for_review: { from: ["captured", "ai_draft"], to: "pending_review" },
  verify: { from: ["pending_review"], to: "verified" },
  approve_official: { from: ["verified"], to: "approved_official" },
  request_revision: { from: ["pending_review", "verified"], to: "ai_draft" },
  supersede: { from: ["verified", "approved_official"], to: "superseded" },
  archive: { from: ["captured", "ai_draft", "pending_review", "verified", "approved_official", "superseded"], to: "archived" },
};

export type ActionCheck = { ok: true } | { ok: false; reason: ActionDenial };
export type ActionDenial =
  "not_human" | "cannot_read" | "invalid_transition" | "self_review" | "not_authorized" | "type_cannot_be_official";

export interface Actor {
  kind: "human" | "ai" | "system";
  user: Profile | null;
}

/**
 * Decide whether an actor may perform an approval action on an item.
 * AI and system actors can never change knowledge status (PRD 2.7).
 */
export function checkApprovalAction(
  actor: Actor,
  action: ApprovalAction,
  item: KnowledgeItem,
  grants: readonly AccessGrant[],
): ActionCheck {
  if (actor.kind !== "human" || !actor.user) return { ok: false, reason: "not_human" };
  const user = actor.user;
  if (!canReadItem(user, item, grants)) return { ok: false, reason: "cannot_read" };
  const transition = TRANSITIONS[action];
  if (!transition.from.includes(item.status)) return { ok: false, reason: "invalid_transition" };

  const management = hasRole(user, "president_director") || hasRole(user, "general_manager");
  const headOfDept = isDepartmentHeadOf(user, item.departmentId);
  const isContributor = item.contributorId === user.id;

  switch (action) {
    case "submit_for_review":
      return isContributor || item.ownerId === user.id ? { ok: true } : { ok: false, reason: "not_authorized" };
    case "verify":
    case "request_revision":
      if (isContributor) return { ok: false, reason: "self_review" };
      return hasRole(user, "reviewer") || headOfDept || management ? { ok: true } : { ok: false, reason: "not_authorized" };
    case "approve_official": {
      if (!canBecomeOfficial(item.type)) return { ok: false, reason: "type_cannot_be_official" };
      if (isContributor) return { ok: false, reason: "self_review" };
      // Technical standards: head of the owning department.
      // Policies and directives: President Director or General Manager.
      if (item.type === "technical_standard") {
        return headOfDept || management ? { ok: true } : { ok: false, reason: "not_authorized" };
      }
      return management ? { ok: true } : { ok: false, reason: "not_authorized" };
    }
    case "supersede":
    case "archive":
      return item.ownerId === user.id || headOfDept || management ? { ok: true } : { ok: false, reason: "not_authorized" };
  }
}

/** Review cadence by type, in days. Historical records do not expire. */
export function reviewIntervalDays(type: KnowledgeType): number | null {
  switch (type) {
    case "approved_policy":
    case "technical_standard":
      return 365;
    case "management_directive":
      return 180;
    case "personal_experience":
    case "lesson_learned":
    case "general_knowledge":
      return 730;
    case "historical_record":
      return null;
  }
}
