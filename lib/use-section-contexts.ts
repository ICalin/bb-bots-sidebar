import { useCallback, useEffect, useState } from "react";
import { useRealtime, useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "../contract";
import type { SectionContext, SectionContextPatch } from "./section-context";

/** Loads one section's context on demand, for menus that don't list every section. */
export function useSectionContextViewer() {
  const rpc = useRpc<typeof rpcContract>();
  const [open, setOpen] = useState<{ sectionId: string; context: SectionContext | null } | null>(null);
  const view = useCallback(async (sectionId: string) => {
    const all = await rpc.call("section_context_get").catch((): Record<string, SectionContext> => ({}));
    setOpen({ sectionId, context: all[sectionId] ?? null });
  }, [rpc]);
  const save = useCallback(async (sectionId: string, patch: SectionContextPatch) => { await rpc.call("section_context_set", { sectionId, ...patch }); }, [rpc]);
  return { open, view, close: () => setOpen(null), save };
}

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
