// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { loadPluginApp } from "@get-bb/plugin-sdk/testing/app";
import { renderSlot } from "./sidebar-host";
import { bot, personalProjectId, thread } from "./fixtures";
import { expandBot } from "./select-helper";

const app = await loadPluginApp(() => import("../app"));
const Sidebar = app.threadLists[0]!.component;
afterEach(cleanup);

async function mount(completed: Record<string, number> = { done: 50 }) {
  const completions = new Map(Object.entries(completed));
  const rows = [thread("main", 100), thread("open", 90), thread("done", 40), thread("working", 30, { indicator: "runtime", status: "active" })];
  function Host() {
    const [activeThreadId, setActive] = useState<string | null>(null);
    return <><button onClick={() => setActive("done")}>View done</button>
      <Sidebar activeThreadId={activeThreadId} activeProjectId="project" isCompactViewport={false} onNavigate={() => {}} searchQuery="" /></>;
  }
  const slot = renderSlot({ component: Host }, {}, {
    sidebarThreads: { projects: [{ id: "project", name: "Project", isPersonal: false, href: "/projects/project", settingsHref: "/projects/project/settings" }], threads: rows },
    rpc: {
      bots_list: () => ({ personalProjectId, bots: [{ ...bot, threadOrder: ["main", "open", "done", "working"] }], sections: [], hosts: [], projects: [], warnings: [],
        threadBindings: rows.map((row) => ({ threadId: row.id, botId: bot.id })),
        completions: [...completions].map(([threadId, completedAt]) => ({ threadId, completedAt })) }),
      conversation_complete: (input) => {
        const { threadId, completed } = input as { threadId: string; completed: boolean };
        if (completed) completions.set(threadId, Date.now()); else completions.delete(threadId);
        return { ok: true, threadIds: [threadId] };
      },
    },
  });
  await slot.findByText(bot.name);
  await expandBot(slot, bot.name);
  const ids = () => Array.from(slot.container.querySelectorAll("[data-sidebar-thread-id]")).map((row) => row.getAttribute("data-sidebar-thread-id"));
  return { slot, ids };
}

it("hides completed conversations behind an explicit completed reveal", async () => {
  const { slot, ids } = await mount();
  await waitFor(() => expect(ids()).toEqual(["main", "open", "working"]));
  const reveal = slot.getByRole("button", { name: "1 completed" });
  fireEvent.click(reveal);
  expect(ids()).toEqual(["main", "open", "done", "working"]);
  const box = slot.getByRole("checkbox", { name: "Mark incomplete: Conversation done" });
  expect(box.getAttribute("aria-checked")).toBe("true");
  fireEvent.click(box);
  await waitFor(() => expect(slot.inspection.rpcCalls.filter((call) => call.method === "conversation_complete")).toEqual([{ method: "conversation_complete", input: { threadId: "done", completed: false } }]));
  await waitFor(() => expect(slot.queryByRole("button", { name: /completed$/ })).toBeNull());
  expect(slot.inspection.navigateCalls).toEqual([]);
});

it("completes from the row checkbox without navigating, and never offers it for working conversations", async () => {
  const { slot, ids } = await mount({});
  fireEvent.click(slot.getByRole("checkbox", { name: "Mark complete: Conversation open" }));
  await waitFor(() => expect(ids()).toEqual(["main", "done", "working"]));
  expect(slot.getByRole("button", { name: "1 completed" })).toBeTruthy();
  expect((slot.getByRole("checkbox", { name: "Mark complete: Conversation working" }) as HTMLButtonElement).disabled).toBe(true);
  expect(slot.inspection.navigateCalls).toEqual([]);
});

it("keeps a completed conversation visible while it is being viewed", async () => {
  const { slot, ids } = await mount();
  fireEvent.click(slot.getByText("View done"));
  await waitFor(() => expect(ids()).toContain("done"));
  expect(slot.container.querySelector('[data-sidebar-thread-id="done"]')?.getAttribute("aria-current")).toBe("page");
});
