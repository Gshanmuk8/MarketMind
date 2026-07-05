import { z } from "zod";

/**
 * Decision Memory contracts (docs 14–15). Zod schemas are shared by the
 * API routes; types by the service and UI.
 */

export const evidenceRefSchema = z.object({
  type: z.enum(["signal", "insight"]),
  id: z.string().min(1),
});
export type EvidenceRef = z.infer<typeof evidenceRefSchema>;

export const alternativeSchema = z.object({
  option: z.string().min(1),
  reason: z.string().default(""),
});
export type Alternative = z.infer<typeof alternativeSchema>;

export const createDecisionSchema = z.object({
  companyId: z.string().min(1),
  title: z.string().min(3).max(300),
  context: z.string().min(1).max(5000),
  evidence: z.array(evidenceRefSchema).max(50).default([]),
});
export type CreateDecisionInput = z.infer<typeof createDecisionSchema>;

export const updateDecisionSchema = z.object({
  title: z.string().min(3).max(300).optional(),
  context: z.string().min(1).max(5000).optional(),
  // Deciding
  choice: z.string().min(1).max(2000).optional(),
  rationale: z.string().max(5000).optional(),
  alternatives: z.array(alternativeSchema).max(20).optional(),
  evidence: z.array(evidenceRefSchema).max(50).optional(),
  revisitAt: z.coerce.date().nullable().optional(),
  // Lifecycle — only the founder moves these (doc 15 rule)
  status: z.enum(["CONSIDERING", "DECIDED", "REVISIT", "REVERSED"]).optional(),
  outcome: z.enum(["PENDING", "VALIDATED", "MIXED", "REGRETTED"]).optional(),
  outcomeNotes: z.string().max(5000).optional(),
});
export type UpdateDecisionInput = z.infer<typeof updateDecisionSchema>;
