import { experimental_useSidebarThreadPullRequest } from "@get-bb/plugin-sdk/app";
import type { PluginSidebarPullRequest } from "@get-bb/plugin-sdk/app";

const STATE_COLOR: Record<PluginSidebarPullRequest["state"], string> = {
  open: "text-green-500",
  draft: "text-muted-foreground",
  merged: "text-purple-500",
  closed: "text-red-500",
};

const CHECKS_COLOR: Partial<Record<PluginSidebarPullRequest["experimental_checks"]["state"], string>> = {
  passing: "bg-green-500",
  pending: "bg-amber-400",
  failing: "bg-red-500",
};

// GitHub-style PR glyphs: open/draft = branch arrow, merged = merge, closed = crossed.
function PrGlyph({ state }: { state: PluginSidebarPullRequest["state"] }) {
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

export function PrBadge({ threadId }: { threadId: string }) {
  const { pullRequest } = experimental_useSidebarThreadPullRequest(threadId);
  if (!pullRequest) return null;
  const checks = pullRequest.state === "open" || pullRequest.state === "draft" ? CHECKS_COLOR[pullRequest.experimental_checks.state] : undefined;
  const label = `PR #${pullRequest.number} ${pullRequest.state}${checks ? `, checks ${pullRequest.experimental_checks.state}` : ""}`;
  return <span role="img" title={label} aria-label={label} onClick={(event) => { event.preventDefault(); event.stopPropagation(); window.open(pullRequest.url, "_blank", "noopener"); }} className={`relative flex shrink-0 items-center px-0.5 ${STATE_COLOR[pullRequest.state]}`}>
    <PrGlyph state={pullRequest.state} />
    {checks ? <span className={`absolute -right-0 -top-0 size-1.5 rounded-full ${checks}`} /> : null}
  </span>;
}
