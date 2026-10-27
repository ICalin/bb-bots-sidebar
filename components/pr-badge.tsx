import { defineRpcContract } from "@get-bb/plugin-sdk";
import { experimental_useRpcKeyedQuery } from "@get-bb/plugin-sdk/app";
import { z } from "zod";

// bb's built-in GitHub plugin finds each environment's PR with `gh`; we only read its keyed rows.
const pullRequestSchema = z.object({
  number: z.number(),
  url: z.string(),
  state: z.enum(["draft", "open", "merged", "closed"]),
  checks: z.object({ state: z.enum(["passing", "failing", "pending", "no_checks", "unknown"]) }).passthrough(),
}).passthrough();
const rowSchema = z.union([
  z.object({ outcome: z.literal("available"), pullRequest: pullRequestSchema }).passthrough(),
  z.object({ outcome: z.enum(["absent", "unavailable"]) }).passthrough(),
]);
const prContract = defineRpcContract({
  pullRequests: { input: z.object({ keys: z.array(z.string()) }), output: z.record(z.string(), rowSchema) },
});
type PullRequest = z.infer<typeof pullRequestSchema>;

const STATE_COLOR: Record<PullRequest["state"], string> = { open: "text-green-500", draft: "text-muted-foreground", merged: "text-purple-500", closed: "text-red-500" };
const CHECKS_COLOR: Partial<Record<PullRequest["checks"]["state"], string>> = { passing: "bg-green-500", pending: "bg-amber-400", failing: "bg-red-500" };

// GitHub-style PR glyphs: open/draft = branch arrow, merged = merge, closed = crossed.
function PrGlyph({ state }: { state: PullRequest["state"] }) {
  return <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="4" cy="3.5" r="1.5" />
    <circle cx="4" cy="12.5" r="1.5" />
    <circle cx="12" cy="12.5" r="1.5" />
    <path d="M4 5v6" />
    {state === "merged" ? <path d="M4 5c0 4 8 2 8 6" /> : null}
    {state === "closed" ? <path d="M10.5 2.5l3 3m0-3l-3 3" /> : null}
    {state === "open" || state === "draft" ? <path d="M12 11V6.5a2 2 0 0 0-2-2H7m1.5-1.5L7 4.5 8.5 6" strokeDasharray={state === "draft" ? "1.5 1.5" : undefined} /> : null}
  </svg>;
}

export function PrBadge({ environmentId }: { environmentId: string }) {
  const { data } = experimental_useRpcKeyedQuery({ pluginId: "bb--github-pr-status", contract: prContract, method: "pullRequests", keys: [environmentId] });
  const row = data?.[environmentId];
  if (!row || row.outcome !== "available") return null;
  const pullRequest = (row as { pullRequest: PullRequest }).pullRequest;
  const checks = pullRequest.state === "open" || pullRequest.state === "draft" ? CHECKS_COLOR[pullRequest.checks.state] : undefined;
  const label = `PR #${pullRequest.number} ${pullRequest.state}${checks ? `, checks ${pullRequest.checks.state}` : ""}`;
  return <a href={pullRequest.url} target="_blank" rel="noreferrer" title={label} aria-label={label} onClick={(event) => event.stopPropagation()} className={`relative flex shrink-0 items-center px-0.5 ${STATE_COLOR[pullRequest.state]}`}>
    <PrGlyph state={pullRequest.state} />
    {checks ? <span className={`absolute right-0 top-0 size-1.5 rounded-full ${checks}`} /> : null}
  </a>;
}
