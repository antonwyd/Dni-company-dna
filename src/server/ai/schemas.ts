import { z } from "zod";
import { GAP_KINDS } from "@/domain/types";

/**
 * Structured-output contracts for every AI capability. Any provider (mock or
 * real) must return data that passes these schemas; the service layer rejects
 * anything else. Model output never grants permissions or changes status.
 */

export const clarificationOutputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("ask"),
    gap: z.enum(GAP_KINDS),
    question: z.string().min(5).max(500),
  }),
  z.object({
    action: z.literal("complete"),
    reason: z.enum(["enough_information", "question_limit", "contributor_requested"]),
  }),
]);
export type ClarificationOutput = z.infer<typeof clarificationOutputSchema>;

export const draftOutputSchema = z.object({
  title: z.string().min(3).max(140),
  summary: z.string().min(3).max(1200),
  sections: z
    .array(
      z.object({
        key: z.enum([...GAP_KINDS, "statement"]),
        value: z.string().min(1).max(4000),
        sourceMessageId: z.string().optional(),
      }),
    )
    .min(1),
  missingInfo: z.array(z.string().max(300)),
});
export type DraftOutput = z.infer<typeof draftOutputSchema>;

export const EVIDENCE_LABELS = [
  "approved_policy",
  "technical_standard",
  "management_directive",
  "verified_knowledge",
  "personal_experience",
  "historical_record",
  "ai_recommendation",
] as const;
export type EvidenceLabel = (typeof EVIDENCE_LABELS)[number];

const citedText = z.object({
  text: z.string().min(1).max(2000),
  label: z.enum(EVIDENCE_LABELS),
  /** Source reference keys such as "S1". Validated against the sources actually sent. */
  citations: z.array(z.string()),
});

export const answerOutputSchema = z.object({
  insufficientEvidence: z.boolean(),
  summary: z.string().min(1).max(2000),
  steps: z.array(citedText),
  risks: z.array(citedText),
  approvalBoundaries: z.array(citedText),
  recommendations: z.array(citedText),
  missingInformation: z.array(z.string().max(400)),
  departments: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low", "none"]),
  limitations: z.array(z.string().max(400)),
});
export type AnswerOutput = z.infer<typeof answerOutputSchema>;
export type CitedText = z.infer<typeof citedText>;
