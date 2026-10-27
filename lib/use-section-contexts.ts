import { useCallback, useEffect, useState } from "react";
import { useRealtime, useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "../contract";
import type { SectionContext, SectionContextPatch } from "./section-context";

export function useSectionContexts(enabled = true) {
  const rpc = useRpc<typeof rpcContract>();
  const [contexts, setContexts] = useState<Record<string, SectionContext>>({});
  const refresh = useCallback(async () => {
    if (!enabled) return;
    try { setContexts(await rpc.call("section_context_get")); } catch { /* keep last known values */ }
  }, [rpc, enabled]);
  useEffect(() => { void refresh(); }, [refresh]);
  useRealtime("project-bots-changed", refresh);
  const save = useCallback(async (sectionId: string, patch: SectionContextPatch) => { await rpc.call("section_context_set", { sectionId, ...patch }); await refresh(); }, [rpc, refresh]);
  return { contexts, save };
}
