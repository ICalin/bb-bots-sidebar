// Section → Notion project links and ticket progress live in plugin storage (bb sections have no metadata field).
import { useCallback, useEffect, useState } from "react";
import { useRealtime, useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "../contract";
import type { SectionProgress } from "./notion-progress";

const LEGACY_KEY = "bots-sidebar:section-notion-projects";

export function useSetSectionNotionLink() {
  const rpc = useRpc<typeof rpcContract>();
  return useCallback((sectionId: string, url: string | null) => rpc.call("section_notion_link_set", { sectionId, url }), [rpc]);
}

export function useSectionNotion(enabled = true) {
  const rpc = useRpc<typeof rpcContract>();
  const [links, setLinks] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, SectionProgress>>({});
  const refresh = useCallback(async () => {
    if (!enabled) return;
    try { const [nextLinks, nextProgress] = await Promise.all([rpc.call("section_notion_links_get"), rpc.call("notion_progress_get")]); setLinks(nextLinks); setProgress(nextProgress); } catch { /* keep last known values */ }
  }, [rpc, enabled]);
  useEffect(() => { if (enabled) void migrateLegacyLinks(rpc).then(refresh); }, [rpc, refresh, enabled]);
  useRealtime("project-bots-changed", refresh);
  const setSectionLink = useSetSectionNotionLink();
  const setLink = useCallback(async (sectionId: string, url: string | null) => { await setSectionLink(sectionId, url); await refresh(); }, [setSectionLink, refresh]);
  return { links, progress, setLink, refreshFromNotion: () => rpc.call("notion_refresh") };
}

// One-time move of browser-local links to the server.
async function migrateLegacyLinks(rpc: ReturnType<typeof useRpc<typeof rpcContract>>) {
  try {
    const legacy = Object.entries(JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "{}") as Record<string, string>).filter(([, url]) => isNotionUrl(url));
    if (!legacy.length) { localStorage.removeItem(LEGACY_KEY); return; }
    await Promise.all(legacy.map(([sectionId, url]) => rpc.call("section_notion_link_set", { sectionId, url })));
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* retry on next load */ }
}

export function isNotionUrl(value: string): boolean {
  try { return /(^|\.)notion\.(so|com|site)$/.test(new URL(value).hostname); } catch { return false; }
}
