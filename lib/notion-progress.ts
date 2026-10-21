import { z } from "zod";

const count = z.number().int().nonnegative();
export const progressCountsSchema = z.object({ done: count, inReview: count, inProgress: count, todo: count, other: count, total: count, mine: count, others: count }).strict();
export const progressErrorSchema = z.object({ error: z.string().trim().min(1).max(500) }).strict();
export const progressInputSchema = z.record(z.string().min(1), z.union([progressCountsSchema, progressErrorSchema]));
export const sectionProgressSchema = z.union([progressCountsSchema.extend({ updatedAt: z.number(), error: z.string().optional() }).strict(), z.object({ updatedAt: z.number(), error: z.string() }).strict()]);
export type SectionProgress = z.infer<typeof sectionProgressSchema>;
export const notionLinksSchema = z.record(z.string(), z.string());
export const progressRecordSchema = z.record(z.string(), sectionProgressSchema);
export const notionRefreshConfigSchema = z.object({ automationId: z.string().min(1), projectId: z.string().min(1) }).strict();
