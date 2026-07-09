import { z } from "zod";
import { MINING_METHODS } from "@/features/ores/ores.schema";

export const SUBMISSION_STATUS = ["pending", "accepted", "rejected"] as const;

/** Natürlicher Schlüssel eines oreOccurrence-Datensatzes. */
const occurrenceKeySchema = z.object({
  oreCode: z.string().regex(/^[A-Z]{2,5}$/),
  systemCode: z.string().regex(/^[A-Z]+$/),
  bodySlug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  method: z.enum(MINING_METHODS),
  patchVersion: z.string().min(1),
});

const proposedOccurrenceSchema = occurrenceKeySchema.extend({
  probabilityPercent: z.number().min(0).max(100),
});

export const submissionSchema = z.object({
  id: z.string().min(1),
  // signatureProfile ist im Schema vorgesehen; UI folgt später
  targetType: z.enum(["oreOccurrence", "signatureProfile"]),
  /** null = Neuanlage; gesetzt = Korrektur eines bestehenden Datensatzes */
  targetKey: occurrenceKeySchema.nullable(),
  proposedChange: proposedOccurrenceSchema,
  submittedBy: z.string().min(1),
  createdAt: z.string().min(1),
  votes: z.object({
    up: z.number().int().min(0),
    down: z.number().int().min(0),
  }),
  voters: z.array(
    z.object({
      userId: z.string().min(1),
      value: z.union([z.literal(1), z.literal(-1)]),
    }),
  ),
  confidenceScore: z.number().min(0).max(1),
  status: z.enum(SUBMISSION_STATUS),
});

export type Submission = z.infer<typeof submissionSchema>;
export type OccurrenceKey = z.infer<typeof occurrenceKeySchema>;
export type ProposedOccurrence = z.infer<typeof proposedOccurrenceSchema>;
