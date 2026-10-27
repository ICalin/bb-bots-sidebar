// Per-section rules context (markdown + Slack channel + keeper thread) lives in plugin storage, like Notion links.
import { z } from "zod";
import type { NewThreadRequest } from "@get-bb/plugin-sdk";

export const SECTION_CONTEXT_MAX = 20000;
export const sectionContextSchema = z.object({ text: z.string().max(SECTION_CONTEXT_MAX), slackChannel: z.string().nullable(), keeperThreadId: z.string().nullable(), updatedAt: z.number() }).strict();
export type SectionContext = z.infer<typeof sectionContextSchema>;
export const sectionContextsSchema = z.record(z.string(), sectionContextSchema);
export const sectionContextPatchSchema = z.object({
  text: z.string().max(SECTION_CONTEXT_MAX).optional(),
  slackChannel: z.string().trim().max(500).nullable().optional(),
  keeperThreadId: z.string().trim().min(1).max(200).nullable().optional(),
}).strict();
export type SectionContextPatch = z.infer<typeof sectionContextPatchSchema>;

export function mergeSectionContext(previous: SectionContext | undefined, patch: SectionContextPatch, now: number): SectionContext {
  const base = previous ?? { text: "", slackChannel: null, keeperThreadId: null, updatedAt: 0 };
  return { text: patch.text ?? base.text, slackChannel: patch.slackChannel === undefined ? base.slackChannel : patch.slackChannel || null, keeperThreadId: patch.keeperThreadId === undefined ? base.keeperThreadId : patch.keeperThreadId, updatedAt: now };
}

/** Prepends the section's rules to the first text part of a new conversation (shifting mention offsets). */
export function withSectionContext(request: NewThreadRequest, sectionName: string, text: string): NewThreadRequest {
  if (!text.trim()) return request;
  const prefix = `<section-context name="${sectionName.replace(/"/g, "&quot;")}">\n${text}\n</section-context>\nFollow these rules. If the task touches an item under "Open questions", ask me before assuming.\n\n`;
  const index = request.input.findIndex((part) => part.type === "text");
  if (index < 0) return { ...request, input: [{ type: "text", text: prefix, mentions: [] }, ...request.input] };
  const input = request.input.map((part, i) => i === index && part.type === "text"
    ? { ...part, text: prefix + part.text, mentions: part.mentions.map((m) => ({ ...m, start: m.start + prefix.length, end: m.end + prefix.length })) } : part);
  return { ...request, input };
}
