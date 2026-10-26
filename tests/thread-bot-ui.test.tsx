// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, waitFor } from "@testing-library/react";
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
