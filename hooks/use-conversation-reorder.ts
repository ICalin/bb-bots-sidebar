import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { useConversationDrop } from "./use-conversation-drop";

export function useConversationReorder(threads: PluginSidebarThread[], onReorder: (source: string, target: string, position: "before" | "after") => void, onNest: (source: string, target: string) => void, botId: string, firstThreadId?: string, onMoveSection?: (source: string, sectionId: string | null) => void) {
  const byId = new Map(threads.map(thread => [thread.id, thread]));
  const parent = (thread: PluginSidebarThread) => thread.parentThreadId && byId.has(thread.parentThreadId) ? thread.parentThreadId : null;
  const drop = useConversationDrop((thread, value) => {
    const target = JSON.parse(value) as { id: string; position: "before" | "after" | "inside" | "section"; sectionId?: string | null };
    if (target.position === "section") { onMoveSection?.(thread.id, target.sectionId ?? null); return; }
    // Dropping beside a thread in another section also moves it into that section.
    const targetThread = byId.get(target.id);
    if (target.position !== "inside" && targetThread && parent(thread) === null && (targetThread.sectionId ?? null) !== (thread.sectionId ?? null)) onMoveSection?.(thread.id, targetThread.sectionId ?? null);
    if (target.position === "inside") onNest(thread.id, target.id);
    else onReorder(thread.id, target.id, target.position);
  }, () => true, (source, element, _x, y, shiftKey) => {
    const botRow = element.closest<HTMLElement>("[data-bot-drop-target]");
    if (botRow) {
      if (botRow.dataset.botDropTarget !== botId || parent(source) !== null || !firstThreadId || source.id === firstThreadId) return null;
      return JSON.stringify({ id: firstThreadId, position: "before", botRow: true });
    }
    const li = element.closest<HTMLElement>("[data-thread-drop-target]");
    const sectionDrop = li ? null : element.closest<HTMLElement>("[data-section-drop-target]");
    if (sectionDrop && onMoveSection && parent(source) === null) {
      const sectionId = sectionDrop.dataset.sectionDropTarget || null;
      return (source.sectionId ?? null) === sectionId ? null : JSON.stringify({ id: source.id, position: "section", sectionId });
    }
    const target = byId.get(li?.dataset.threadDropTarget ?? "");
    if (!li || !target || source.id === target.id || (!shiftKey && parent(source) !== parent(target))) return null;
    // Do not offer a nesting drop that would make a cycle.
    if (shiftKey) {
      let ancestor: PluginSidebarThread | undefined = target;
      const seen = new Set<string>();
      while (ancestor && !seen.has(ancestor.id)) {
        if (ancestor.id === source.id) return null;
        seen.add(ancestor.id); ancestor = byId.get(ancestor.parentThreadId ?? "");
      }
    }
    const bounds = li.querySelector(".thread-row")?.getBoundingClientRect();
    if (!bounds) return null;
    return JSON.stringify({ id: target.id, position: shiftKey ? "inside" : y > bounds.top + bounds.height / 2 ? "after" : "before" });
  });
  const target = drop.drag?.botId ? JSON.parse(drop.drag.botId) as { id: string; position: "before" | "after" | "inside" | "section"; sectionId?: string | null; botRow?: boolean } : null;
  return { ...drop, target };
}
