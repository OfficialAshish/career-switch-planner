import { z } from 'zod';
import { proposalSchema } from './schema.js';
export const researchInputSchema = z
  .object({
    goal: z.string().min(3).max(4000),
    baseline: z.string().max(6000),
    jd: z.string().max(10000),
    location: z.string().max(300),
    weeklyHours: z.number().min(1).max(60),
    sourceUrls: z.array(z.string().url().max(2048)).max(6),
    onlineConsent: z.literal(true),
    includeContext: z.boolean(),
    replaceStarter: z.boolean(),
  })
  .strict();
export type ResearchInput = z.infer<typeof researchInputSchema>;
export const researchRunSchema = z
  .object({
    id: z.string().uuid(),
    input: researchInputSchema,
    baseRevision: z.number().int().nonnegative(),
    status: z.enum(['running', 'ready', 'failed', 'cancelled', 'interrupted', 'applied']),
    stage: z.string().max(100),
    createdAt: z.string(),
    updatedAt: z.string(),
    attempt: z.number().int().min(1).max(100),
    queries: z.array(z.string().max(180)).max(3),
    results: z
      .array(
        z.object({
          title: z.string().max(300),
          url: z.string().max(2048),
          snippet: z.string().max(500),
        }),
      )
      .max(15),
    sources: z
      .array(
        z.object({
          title: z.string().max(300),
          url: z.string().max(2048),
          excerpt: z.string().max(18000),
        }),
      )
      .max(6),
    warnings: z.array(z.string().max(1000)).max(60),
    error: z.string().max(3000),
    proposal: proposalSchema.nullable(),
  })
  .strict();
export type ResearchRun = z.infer<typeof researchRunSchema>;
