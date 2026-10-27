// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent } from "@testing-library/react";
import { loadPluginApp } from "@get-bb/plugin-sdk/testing/app";
import { renderSlot } from "./sidebar-host";
import { bot, personalProjectId, thread } from "./fixtures";
import { expandBot } from "./select-helper";

const app = await loadPluginApp(() => import("../app"));
const Sidebar = app.threadLists[0]!.component;
afterEach(cleanup);

const run = {
  key: "worker:wfr_1", ownerThreadId: "worker", name: "category-investigation", runId: "wfr_1", status: "working", startedAt: 1,
  agents: [
    { threadId: "wf-a", title: "Research client-bot", status: "working", createdAt: 1 },
    { threadId: "wf-b", title: "Research paid-social", status: "idle", createdAt: 2 },
  ],
};

async function mount(initialActive: string | null = null) {
  const rows = [thread("main", 100), thread("worker", 90)];
  function Host() {
    const [activeThreadId, setActive] = useState<string | null>(initialActive);
    return <><button onClick={() => setActive("wf-b")}>View agent</button>
      <Sidebar activeThreadId={activeThreadId} activeProjectId="project" isCompactViewport={false} onNavigate={() => {}} searchQuery="" /></>;
  }
  const slot = renderSlot({ component: Host }, {}, {
    sidebarThreads: { projects: [{ id: "project", name: "Project", isPersonal: false, href: "/projects/project", settingsHref: "/projects/project/settings" }], threads: rows },
    rpc: {
      bots_list: () => ({ personalProjectId, bots: [{ ...bot, threadOrder: ["main", "worker"] }], sections: [], hosts: [], projects: [], warnings: [],
        threadBindings: rows.map((row) => ({ threadId: row.id, botId: bot.id })) }),
      workflow_runs: () => ({ runs: [run] }),
    },
  });
  await slot.findByText(bot.name);
  return slot;
}

it("shows a live workflow as a virtual child that reveals and opens its agent threads", async () => {
  const slot = await mount();
  await expandBot(slot, bot.name);
  // The workflow alone gives the conversation a disclosure, and a live run reveals itself once.
  await slot.findByRole("button", { name: "Collapse children of Conversation worker" });
  const runRow = await slot.findByRole("button", { name: /^Show agents: category-investigation workflow, 1 running$/ });
  expect(runRow.closest("ul")?.classList.contains("conversation-children")).toBe(true);
  expect(slot.container.querySelector("[data-workflow-run] [data-complete-thread-id]")).toBeNull();
  expect(slot.queryByText("Research client-bot")).toBeNull();
  fireEvent.click(runRow);
  fireEvent.click(await slot.findByText("Research paid-social"));
  expect(slot.inspection.navigateCalls).toContainEqual({ method: "toThread", threadId: "wf-b", options: { split: false } });
  // Folding sticks while the same run keeps working.
  fireEvent.click(slot.getByRole("button", { name: "Collapse children of Conversation worker" }));
  expect(slot.queryByText("category-investigation")).toBeNull();
});

it("unfolds the bot, the owning conversation, and the run when one of its agent threads is viewed", async () => {
  const slot = await mount();
  fireEvent.click(slot.getByText("View agent"));
  const agent = await slot.findByText("Research paid-social");
  expect(agent.closest("a")?.getAttribute("aria-current")).toBe("page");
  expect(slot.getByRole("button", { name: "Collapse children of Conversation worker" })).toBeTruthy();
});
