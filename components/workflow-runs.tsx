import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { experimental_ThreadStatusGlyph as ThreadStatusGlyph, useRealtime, useRealtimeConnectionState, useRpc } from "@get-bb/plugin-sdk/app";
import type { BbNavigate } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "../contract";
import { WORKFLOW_RUNS_CHANGED, workflowRunsByOwner, workflowRunSummary, type WorkflowAgentStatus, type WorkflowRun } from "../lib/workflow-runs";

export interface WorkflowRunsState {
  byOwner: ReadonlyMap<string, readonly WorkflowRun[]>;
  /** The conversation that started the workflow whose agent thread this is. */
  ownerOf: (threadId: string | null) => string | null;
}

const EMPTY: WorkflowRunsState = { byOwner: new Map(), ownerOf: () => null };
export const WorkflowRunsContext = createContext<WorkflowRunsState>(EMPTY);
export const useWorkflowRuns = () => useContext(WorkflowRunsContext);

export function useWorkflowRunsData(): WorkflowRunsState {
  const rpc = useRpc<typeof rpcContract>();
  const [runs, setRuns] = useState<readonly WorkflowRun[]>([]);
  const sequence = useRef(0);
  const connection = useRealtimeConnectionState();
  const refresh = useCallback(() => {
    const current = ++sequence.current;
    void rpc.call("workflow_runs").then(
      (result) => { if (current === sequence.current) setRuns(result.runs); },
      () => { /* Workflows are supplementary; keep the last known runs. */ },
    );
  }, [rpc]);
  useEffect(() => { refresh(); return () => { sequence.current++; }; }, [refresh]);
  const previousConnection = useRef(connection);
  useEffect(() => {
    if (connection === "connected" && previousConnection.current !== "connected") refresh();
    previousConnection.current = connection;
  }, [connection, refresh]);
  useRealtime(WORKFLOW_RUNS_CHANGED, refresh);
  return useMemo(() => {
    const byOwner = workflowRunsByOwner(runs);
    const agents = new Map(runs.flatMap((run) => run.agents.map((agent) => [agent.threadId, run.ownerThreadId] as const)));
    return { byOwner, ownerOf: (threadId) => (threadId ? agents.get(threadId) ?? null : null) };
  }, [runs]);
}

const GLYPH: Record<WorkflowAgentStatus, "runtime" | "waiting-for-input" | "unread-error" | "none"> = {
  working: "runtime", waiting: "waiting-for-input", error: "unread-error", idle: "none",
};

function Chevron({ expanded }: { expanded: boolean }) {
  return <svg className={expanded ? "rotate-90" : undefined} aria-hidden="true" width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m7 5 5 5-5 5" /></svg>;
}

/** The run uses bb's workflow glyph while working; agents use thread glyphs. */
function WorkflowGlyph({ status, agent = false }: { status: WorkflowAgentStatus; agent?: boolean }) {
  if (status === "idle") return agent
    ? <svg className="conversation-status" aria-hidden="true" viewBox="0 0 16 16"><circle cx="8" cy="8" r="2.5" fill="currentColor" /></svg>
    : <svg className="conversation-status" aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="4" cy="4" r="1.6" /><circle cx="12" cy="8" r="1.6" /><circle cx="4" cy="12" r="1.6" /><path d="M5.6 4.4 10.4 7.6M5.6 11.6l4.8-3.2" /></svg>;
  return <ThreadStatusGlyph indicator={status === "working" && !agent ? "workflow" : GLYPH[status]} size="compact" />;
}

/**
 * A virtual child row: one live BB workflow run started by its parent
 * conversation. It is not a thread; it reveals the run's agent threads.
 */
export function WorkflowRunRow({ run, activeThreadId, navigate, onNavigate }: {
  run: WorkflowRun; activeThreadId: string | null; navigate: BbNavigate; onNavigate: () => void;
}) {
  const containsActive = run.agents.some((agent) => agent.threadId === activeThreadId);
  const [expanded, setExpanded] = useState(containsActive);
  useEffect(() => { if (containsActive) setExpanded(true); }, [containsActive]);
  const listId = useId();
  const label = `${run.name} workflow, ${workflowRunSummary(run)}`;
  return <li className="workflow-run" data-workflow-run={run.key} data-workflow-status={run.status}>
    <button type="button" className="thread-row workflow-run-row flex min-h-7 w-full items-center gap-1.5 rounded-md py-1 pr-1 text-left text-xs text-muted-foreground hover:bg-state-hover hover:text-foreground"
      aria-expanded={expanded} aria-controls={listId} aria-label={`${expanded ? "Hide" : "Show"} agents: ${label}`} title={run.runId ? `${label} · ${run.runId}` : label}
      data-active-descendant={!expanded && containsActive} onClick={() => setExpanded((value) => !value)}>
      <span className="conversation-disclosure-slot" aria-hidden="true"><Chevron expanded={expanded} /></span>
      <WorkflowGlyph status={run.status} />
      <span className="min-w-0 flex-1 truncate">{run.name}</span>
      <span className="workflow-run-count shrink-0 tabular-nums">{workflowRunSummary(run)}</span>
    </button>
    <ul id={listId} className="conversation-children" hidden={!expanded}>{expanded ? run.agents.map((agent) =>
      <li key={agent.threadId}>
        <a href={`#thread-${agent.threadId}`} role="link" tabIndex={0} data-workflow-agent-id={agent.threadId} aria-current={agent.threadId === activeThreadId ? "page" : undefined}
          className="thread-row workflow-agent-row flex min-h-6 cursor-pointer items-center gap-1.5 rounded-md py-0.5 pr-1 text-[11px] text-muted-foreground hover:bg-state-hover hover:text-foreground"
          onClick={(event) => { event.preventDefault(); navigate.toThread(agent.threadId, { split: event.metaKey || event.ctrlKey }); onNavigate(); }}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); navigate.toThread(agent.threadId, { split: event.metaKey || event.ctrlKey }); onNavigate(); } }}>
          <span className="conversation-disclosure-slot" aria-hidden="true" />
          <WorkflowGlyph status={agent.status} agent />
          <span className="min-w-0 flex-1 truncate">{agent.title}</span>
        </a>
      </li>) : null}</ul>
  </li>;
}
