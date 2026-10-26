/**
 * Deterministic mock AI provider for development.
 *
 * It sends nothing outside this server. Clarification uses simple rules to
 * detect knowledge gaps; drafting only rearranges the contributor's own words;
 * answering only quotes the authorized sources it is given. It never invents
 * technical details or company policy, which is also the behaviour the real
 * provider is evaluated against.
 */
import type { CaptureMessage, ClarificationQuestion, ContentLanguage, GapKind } from "@/domain/types";
import type { AIProvider, AnswerInput, AuthorizedSource, ClarificationInput, DraftInput } from "./provider";
import type { AnswerOutput, CitedText, ClarificationOutput, DraftOutput, EvidenceLabel } from "./schemas";

export const MAX_QUESTIONS = 5;

/** General (non company-specific) meanings for a few common terms. */
const GLOSSARY: Record<string, { id: string; en: string }> = {
  bushing: {
    id: "selongsong yang menahan gesekan antara poros dan rumahnya",
    en: "a sleeve that takes the friction between a shaft and its housing",
  },
  jig: { id: "alat bantu untuk memposisikan benda kerja", en: "a tool that holds a workpiece in position" },
  dies: { id: "cetakan yang membentuk material pada proses press", en: "the tooling that shapes material in a press" },
  ppic: { id: "Production Planning and Inventory Control", en: "Production Planning and Inventory Control" },
  fob: { id: "istilah Incoterms: Free On Board", en: "the Incoterms rule Free On Board" },
  kaizen: { id: "perbaikan berkelanjutan dalam langkah kecil", en: "continuous improvement in small steps" },
};

const PATTERNS: Record<Exclude<GapKind, "terminology" | "conflict">, RegExp> = {
  context: /\b(bagian|lini|line|area|unit|stasiun|komponen|poros|spindle|motor|pelanggan|customer|proses|section|part of|station)\b/i,
  causal: /\b(karena|sebab|gejala|tanda|bunyi|getar\w*|panas|bocor|aus|retak|because|symptom\w*|sign\w*|noise|vibration)\b/i,
  criteria:
    /(\d+(?:[.,]\d+)?\s?(mm|cm|µm|um|bar|°c|derajat|jam|hari|minggu|%|kg|nm|rpm|hours|days))|\b(standar|toleransi|batas|limit|spesifikasi|sop|standard|tolerance)\b/i,
  responsibility:
    /\b(operator|teknisi|pic|penanggung jawab|bertanggung jawab|dilakukan oleh|leader|supervisor|kepala|technician|responsible)\b/i,
  approval_authority: /\b(disetujui|persetujuan|approval|wewenang|otorisasi|direktur|approve\w*|authori[sz]\w*)\b/i,
  outdated: /\b(masih berlaku|sudah tidak berlaku|berlaku sejak|still valid|no longer valid|valid since)\b/i,
};

function contributorText(messages: readonly CaptureMessage[]): string {
  return messages
    .filter((m) => m.role === "contributor")
    .map((m) => m.text)
    .join("\n");
}

function findSubject(text: string): string | null {
  const match = text.match(/\b(mesin|machine|line|lini)\s+[\w-]+/i);
  return match ? match[0] : null;
}

function findUnknownTerm(text: string): string | null {
  const lower = text.toLowerCase();
  for (const term of Object.keys(GLOSSARY)) {
    if (new RegExp(`\\b${term}\\b`).test(lower)) return term;
  }
  return null;
}

function needsApprovalQuestion(input: ClarificationInput): boolean {
  return (
    input.type === "management_directive" ||
    input.type === "approved_policy" ||
    input.type === "technical_standard" ||
    input.category === "japan_negotiation" ||
    input.category === "finance_costing" ||
    input.category === "sales_customers"
  );
}

function looksDated(text: string): boolean {
  const years = [...text.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
  const thisYear = new Date().getFullYear();
  return years.some((y) => y <= thisYear - 3) || /\b(dulu|zaman dulu|sebelumnya|dahulu|previously|used to)\b/i.test(text);
}

function questionText(gap: GapKind, lang: ContentLanguage, text: string): string {
  const en = lang === "en";
  const subject = findSubject(text);
  switch (gap) {
    case "terminology": {
      const term = findUnknownTerm(text) ?? "";
      const meaning = GLOSSARY[term];
      const general = meaning ? (en ? meaning.en : meaning.id) : "";
      return en
        ? `In general, "${term}" is ${general}. I do not know which ${term} the company uses or its internal specification. Is there a part number, size, or internal standard?`
        : `Secara umum, "${term}" adalah ${general}. Saya tidak tahu ${term} jenis apa yang dipakai di perusahaan atau spesifikasi internalnya. Apakah ada nomor part, ukuran, atau standar internal?`;
    }
    case "context":
      if (subject) {
        return en ? `Which part of ${subject} does this apply to?` : `Pada bagian mana dari ${subject} hal ini berlaku?`;
      }
      return en
        ? "In which situation or process does this apply (for example a machine, line, customer, or document)?"
        : "Dalam situasi atau proses apa hal ini berlaku (misalnya mesin, lini, pelanggan, atau dokumen tertentu)?";
    case "causal":
      return en
        ? "What symptoms or conditions show that this action is needed?"
        : "Gejala atau kondisi apa yang menunjukkan bahwa tindakan ini diperlukan?";
    case "criteria":
      return en
        ? "Is there an approved inspection standard, measurement limit, or criterion? If not, just say there is none."
        : 'Apakah ada standar inspeksi, batas ukur, atau kriteria yang sudah disetujui? Jika belum ada, cukup tulis "belum ada".';
    case "responsibility":
      return en
        ? "Who usually does this, or who is responsible for it?"
        : "Siapa yang biasanya melakukan ini, atau siapa penanggung jawabnya?";
    case "approval_authority":
      return en
        ? "Who has the authority to approve this decision or action?"
        : "Siapa yang berwenang menyetujui keputusan atau tindakan ini?";
    case "outdated":
      return en
        ? "Is this information still valid today, or has the practice changed?"
        : "Apakah informasi ini masih berlaku saat ini, atau praktiknya sudah berubah?";
    case "conflict":
      return en
        ? "This may differ from existing knowledge. Which one is correct today?"
        : "Ini mungkin berbeda dengan pengetahuan yang sudah ada. Mana yang benar saat ini?";
  }
}

/** Ordered list of gaps that are still open, given what the contributor has said. */
export function openGaps(input: ClarificationInput): GapKind[] {
  const text = contributorText(input.messages);
  const alreadyAsked = new Set(input.questions.map((q) => q.gap));
  const gaps: GapKind[] = [];
  if (findUnknownTerm(text)) gaps.push("terminology");
  if (!PATTERNS.context.test(text)) gaps.push("context");
  if (!PATTERNS.causal.test(text)) gaps.push("causal");
  if (!PATTERNS.criteria.test(text)) gaps.push("criteria");
  if (!PATTERNS.responsibility.test(text)) gaps.push("responsibility");
  if (needsApprovalQuestion(input) && !PATTERNS.approval_authority.test(text)) gaps.push("approval_authority");
  if (looksDated(text) && !PATTERNS.outdated.test(text)) gaps.push("outdated");
  return gaps.filter((g) => !alreadyAsked.has(g));
}

function sectionValue(messages: readonly CaptureMessage[], q: ClarificationQuestion): CaptureMessage | undefined {
  return q.answerMessageId ? messages.find((m) => m.id === q.answerMessageId) : undefined;
}

function missingLabel(gap: GapKind, lang: ContentLanguage): string {
  const id: Record<GapKind, string> = {
    terminology: "Spesifikasi atau istilah internal belum dijelaskan",
    context: "Konteks atau lokasi penerapan belum dijelaskan",
    causal: "Gejala atau penyebab belum dijelaskan",
    criteria: "Standar atau batas ukur belum diketahui",
    responsibility: "Penanggung jawab belum diketahui",
    approval_authority: "Pihak yang berwenang menyetujui belum diketahui",
    outdated: "Belum dipastikan apakah masih berlaku",
    conflict: "Konflik dengan pengetahuan lain belum diselesaikan",
  };
  const en: Record<GapKind, string> = {
    terminology: "Internal specification or term not explained",
    context: "Context or location not explained",
    causal: "Symptoms or cause not explained",
    criteria: "Standard or measurement limit unknown",
    responsibility: "Responsible person unknown",
    approval_authority: "Approval authority unknown",
    outdated: "Not confirmed whether still valid",
    conflict: "Conflict with other knowledge not resolved",
  };
  return lang === "en" ? en[gap] : id[gap];
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

const LABEL_BY_TYPE: Record<AuthorizedSource["type"], EvidenceLabel> = {
  approved_policy: "approved_policy",
  technical_standard: "technical_standard",
  management_directive: "management_directive",
  personal_experience: "personal_experience",
  historical_record: "historical_record",
  lesson_learned: "verified_knowledge",
  general_knowledge: "verified_knowledge",
  decision: "historical_record",
};

export class MockAIProvider implements AIProvider {
  readonly name = "mock";
  readonly external = false;

  async nextClarification(input: ClarificationInput): Promise<ClarificationOutput> {
    if (input.contributorRequestedStop) return { action: "complete", reason: "contributor_requested" };
    if (input.questions.length >= MAX_QUESTIONS) return { action: "complete", reason: "question_limit" };
    const next = openGaps(input)[0];
    if (!next) return { action: "complete", reason: "enough_information" };
    return { action: "ask", gap: next, question: questionText(next, input.language, contributorText(input.messages)) };
  }

  async structureDraft(input: DraftInput): Promise<DraftOutput> {
    const first = input.messages.find((m) => m.role === "contributor");
    const statement = first?.text ?? "";
    const sections: DraftOutput["sections"] = [{ key: "statement", value: statement, sourceMessageId: first?.id }];
    const missingInfo: string[] = [];
    for (const q of input.questions) {
      const answer = sectionValue(input.messages, q);
      if (q.state === "answered" && answer) {
        sections.push({ key: q.gap, value: answer.text, sourceMessageId: answer.id });
      } else {
        missingInfo.push(missingLabel(q.gap, input.language));
      }
    }
    // Extra contributor messages that did not answer a question are kept verbatim too.
    const used = new Set(sections.map((s) => s.sourceMessageId));
    for (const m of input.messages) {
      if (m.role === "contributor" && !used.has(m.id)) sections.push({ key: "context", value: m.text, sourceMessageId: m.id });
    }
    return {
      title: truncate(statement, 90) || "Draf pengetahuan",
      summary: truncate(statement, 400) || "-",
      sections,
      missingInfo,
    };
  }

  async answer(input: AnswerInput): Promise<AnswerOutput> {
    const en = input.language === "en";
    if (input.sources.length === 0) {
      return {
        insufficientEvidence: true,
        summary: en
          ? "I could not find verified company knowledge that answers this question. I will not guess company policy."
          : "Saya tidak menemukan pengetahuan perusahaan yang sudah diverifikasi untuk menjawab pertanyaan ini. Saya tidak akan menebak kebijakan perusahaan.",
        steps: [],
        risks: [],
        approvalBoundaries: [],
        recommendations: [
          {
            label: "ai_recommendation",
            citations: [],
            text: en
              ? "Ask the knowledge owner in the relevant department, then capture the answer in DNI so it can be reviewed."
              : "Tanyakan kepada pemilik pengetahuan di departemen terkait, lalu rekam jawabannya di DNI agar bisa direview.",
          },
        ],
        missingInformation: [],
        departments: [],
        confidence: "none",
        limitations: [
          en ? "Only knowledge you are authorized to see was searched." : "Pencarian hanya mencakup pengetahuan yang boleh Anda akses.",
        ],
      };
    }

    const steps: CitedText[] = [];
    const risks: CitedText[] = [];
    const approvals: CitedText[] = [];
    const missing = new Set<string>();
    for (const s of input.sources) {
      const label = LABEL_BY_TYPE[s.type];
      for (const section of s.sections) {
        if (section.key === "statement" || section.key === "criteria" || section.key === "context") {
          steps.push({ text: section.value, label, citations: [s.ref] });
        } else if (section.key === "approval_authority") {
          approvals.push({ text: section.value, label, citations: [s.ref] });
        } else if (section.key === "causal") {
          risks.push({ text: section.value, label, citations: [s.ref] });
        }
      }
      if (s.risks) risks.push({ text: s.risks, label: "historical_record", citations: [s.ref] });
      for (const m of s.missingInfo) missing.add(m);
    }

    const top = input.sources[0]!;
    const official = input.sources.some((s) => s.status === "approved_official");
    const confidence = official ? "high" : input.sources.length > 1 ? "medium" : "low";
    const limitations = [
      en
        ? "This answer only quotes the cited sources. It is not a new policy."
        : "Jawaban ini hanya mengutip sumber yang disebut. Ini bukan kebijakan baru.",
    ];
    if (!official) {
      limitations.push(
        en
          ? "None of the sources is an approved official policy or standard."
          : "Tidak ada sumber yang berstatus kebijakan atau standar resmi yang disetujui.",
      );
    }
    if (input.sources.some((s) => s.kind === "decision")) {
      limitations.push(
        en
          ? "Historical decisions describe what was decided then; they are not current instructions."
          : "Keputusan historis menjelaskan apa yang diputuskan saat itu, bukan instruksi yang berlaku sekarang.",
      );
    }
    if (approvals.length === 0) {
      missing.add(en ? "No source states the approval authority" : "Tidak ada sumber yang menyebut pihak berwenang menyetujui");
    }

    return {
      insufficientEvidence: false,
      summary: en
        ? `The most relevant source is "${top.title}". Review the cited items below with their owners before acting.`
        : `Sumber paling relevan adalah "${top.title}". Tinjau butir yang dikutip di bawah bersama pemiliknya sebelum bertindak.`,
      steps,
      risks,
      approvalBoundaries: approvals,
      recommendations: [
        {
          label: "ai_recommendation",
          citations: [],
          text: en
            ? "Confirm the missing information with the knowledge owner before making a commitment."
            : "Konfirmasikan informasi yang belum ada kepada pemilik pengetahuan sebelum membuat komitmen.",
        },
      ],
      missingInformation: [...missing],
      departments: [...new Set(input.sources.map((s) => s.departmentId))],
      confidence,
      limitations,
    };
  }
}
