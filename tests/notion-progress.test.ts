import { describe, expect, it } from "vitest";
import { progressInputSchema } from "../lib/notion-progress";

const counts = { done: 6, inReview: 2, inProgress: 2, todo: 2, other: 0, total: 12, mine: 7, others: 5 };
describe("notion progress input", () => {
  it("accepts counts or an error per section", () => {
    expect(progressInputSchema.parse({ a: counts, b: { error: "page not found" } })).toEqual({ a: counts, b: { error: "page not found" } });
  });
  it("rejects missing, negative, or unknown fields", () => {
    expect(progressInputSchema.safeParse({ a: { ...counts, done: -1 } }).success).toBe(false);
    expect(progressInputSchema.safeParse({ a: { done: 1 } }).success).toBe(false);
    expect(progressInputSchema.safeParse({ a: { ...counts, extra: 1 } }).success).toBe(false);
  });
});
