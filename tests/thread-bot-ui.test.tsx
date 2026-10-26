// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { loadPluginApp } from "@get-bb/plugin-sdk/testing/app";
import { renderSlot } from "./sidebar-host";
import { bot } from "./fixtures";
import { selectOption } from "./select-helper";
import type { ThreadBot } from "../contract";

const app = await loadPluginApp(() => import("../app"));
afterEach(cleanup);

const nova = { id: "nova", name: "Nova", role: "Research", avatar: bot.avatar, hidden: false };
const atlas = { id: bot.id, name: bot.name, role: bot.role, avatar: bot.avatar, hidden: false };

function mount(component: React.ComponentType<never>, props: object, initial: ThreadBot) {
  let current = initial;
  const slot = renderSlot({ component: component as React.ComponentType<object> }, props, {
    rpc: {
      thread_bot: () => current,
      conversation_set_bot: ({ botId }: { botId: string | null }) => { current = { ...current, botId, explicit: Boolean(botId), detached: !botId }; return { ok: true, threadIds: ["thread"] }; },
    } as never,
  });
  return slot;
}

it("registers the picker in every thread header and Info tab, independent of the thread list", () => {
  expect(app.threadHeaderActions.map((entry) => entry.id)).toEqual(["thread-bot"]);
  expect(app.threadInfoRows.map((entry) => [entry.id, entry.group])).toEqual([["thread-bot", "1_thread"]]);
  expect(app.threadInfoSections.map((entry) => [entry.id, entry.group])).toEqual([["thread-bot-prompt", "0_bot"]]);
});

it("moves the thread between bots and to No bot from the header", async () => {
  const Header = app.threadHeaderActions[0]!.component;
  const slot = mount(Header as never, { threadId: "thread", projectId: "project", isCompactViewport: false }, { botId: bot.id, explicit: true, detached: false, bots: [atlas, nova] });
  const trigger = await slot.findByRole("combobox", { name: `Bot: ${bot.name}. Change bot` });
  selectOption(trigger, "Nova,Research"); // jsdom drops the sr-only separator space
  await waitFor(() => expect(slot.inspection.rpcCalls.filter((entry) => entry.method === "conversation_set_bot").map((entry) => entry.input)).toEqual([{ threadId: "thread", botId: "nova" }]));
  selectOption(await slot.findByRole("combobox", { name: "Bot: Nova. Change bot" }), "No bot");
  await slot.findByRole("combobox", { name: "No bot. Assign to a bot" });
  expect(slot.inspection.rpcCalls.at(-2)?.input).toEqual({ threadId: "thread", botId: null });
});

it("shows the bot in the Info tab and refreshes when bots change", async () => {
  const Row = app.threadInfoRows[0]!.component;
  const slot = mount(Row as never, { threadId: "thread", projectId: "project", environment: null }, { botId: null, explicit: false, detached: false, bots: [atlas] });
  await slot.findByText("No bot");
  expect(slot.getByText("Bot")).toBeTruthy();
  const reads = () => slot.inspection.rpcCalls.filter((entry) => entry.method === "thread_bot").length;
  const before = reads();
  await slot.emitRealtime("project-bots-changed", { updatedAt: 2 });
  await waitFor(() => expect(reads()).toBe(before + 1));
});

it("lists the bot's prompt additions below the details, each block folded until opened", async () => {
  const Section = app.threadInfoSections[0]!.component;
  let prompt = { botId: bot.id, tools: ["bot_read_state", "bot_update_state"], skills: ["bots-sidebar"], sections: [
    { id: "bot", title: "Bot context", text: "# Bot: Test bot\nRole: Assistant" },
    { id: "tools", title: "Tool guidance", text: "Use bb bots list." },
  ] };
  const slot = renderSlot({ component: Section }, { threadId: "thread", projectId: "project", environment: null }, { rpc: { thread_bot_prompt: () => prompt } as never });
  const toggle = await slot.findByRole("button", { name: /Bot context/ });
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(slot.queryByText(/Role: Assistant/)).toBeNull();
  expect(slot.getByText(/Tools: bot_read_state, bot_update_state · Skill: bots-sidebar/)).toBeTruthy();
  fireEvent.click(toggle);
  expect(slot.getByText(/Role: Assistant/)).toBeTruthy();
  expect(slot.queryByText("Use bb bots list.")).toBeNull();
  // Leaving the bot hides the whole section.
  prompt = { botId: null, tools: [], skills: [], sections: [] } as never;
  await slot.emitRealtime("project-bots-changed", { updatedAt: 3 });
  await waitFor(() => expect(slot.queryByRole("button", { name: /Bot context/ })).toBeNull());
});
