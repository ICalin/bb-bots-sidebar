import { useRef, useState } from "react";
import { experimental_NewThreadComposer as NewThreadComposer, useSdk } from "@get-bb/plugin-sdk/app";
import type { NewThreadRequest, PluginSidebarSection } from "@get-bb/plugin-sdk/app";
import type { BotMetadata } from "../contract";
import { conversationDraftKey } from "../lib/worktree-launch";
import { launchComposerSeeds } from "../lib/launch-preset";
import { Input } from "./ui/input";
import { isNotionUrl, useSetSectionNotionLink } from "../lib/section-notion-links";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

export type ConversationTarget = {
  bot: BotMetadata;
  kind: "bot" | "project" | "worktree" | "fork";
  projectId: string;
  environment: NewThreadRequest["environment"];
  makeMain: boolean;
  sourceThreadId?: string;
};

export function ConversationDialog({ target, sections = [], onClose, onCreate }: {
  target: ConversationTarget;
  sections?: readonly PluginSidebarSection[];
  onClose: () => void;
  onCreate: (request: NewThreadRequest, sectionId: string | null) => Promise<void>;
}) {
  // The target is captured when the popup opens. Let the host's own project
  // picker handle changes without re-seeding and resetting the user's choices.
  const projectId = target.projectId;
  const seeds = target.kind === "fork" ? {} : launchComposerSeeds(target.bot.launchPreset);
  const [sectionId, setSectionId] = useState<string | null>(() => sections.find((section) => section.name.toLowerCase() === "random")?.id ?? null);
  const [sectionDraft, setSectionDraft] = useState<string | null>(null);
  const [notionDraft, setNotionDraft] = useState("");
  const sdk = useSdk();
  const setLink = useSetSectionNotionLink();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const title = target.kind === "bot" ? "New conversation" : target.kind === "worktree" ? "New conversation in worktree" : target.kind === "fork" ? "Fork conversation" : "New conversation in project";
  const description = target.kind === "bot"
    ? `Chat with ${target.bot.name} without a project. Choose the machine and harness before sending.`
    : target.kind === "worktree"
      ? "Start in a fresh worktree. Choose the branch and harness before sending."
      : target.kind === "fork"
        ? "Continue this conversation in the same BB environment."
      : "Start in the project checkout. Change the project, machine, or harness here before sending.";
  return <Dialog open onOpenChange={(open) => { if (!open && !submitting.current) onClose(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" onOpenAutoFocus={(event) => event.preventDefault()}>
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      <NewThreadComposer {...seeds} defaultProjectId={projectId} defaultEnvironment={target.environment} layout="document" focusRequest={1} draftKey={conversationDraftKey({ botId: target.bot.id, kind: target.kind, makeMain: target.makeMain, projectId, environment: target.environment })} onSubmit={async (request) => {
        if (submitting.current) throw new Error("A conversation is already being created.");
        submitting.current = true; setPending(true); setError(null);
        try {
          const name = sectionDraft?.trim();
          if (sectionDraft !== null && !name) throw new Error("Name the new section or pick an existing one.");
          const notionUrl = notionDraft.trim();
          if (name && notionUrl && !isNotionUrl(notionUrl)) throw new Error("The Notion project must be a Notion page link.");
          const created = name ? await sdk.threadSections.create({ name }) : null;
          if (created && notionUrl) await setLink(created.id, notionUrl);
          const targetSectionId = created ? created.id : sectionId;
          await onCreate(request, targetSectionId);
        }
        catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); throw cause; }
        finally { submitting.current = false; setPending(false); }
      }} />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">Section<select aria-label="Section" className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground" value={sectionDraft !== null ? "__new_section__" : sectionId ?? ""} onChange={(event) => {
        if (event.target.value === "__new_section__") { setSectionDraft(""); return; }
        setSectionDraft(null); setSectionId(event.target.value || null);
      }}>
        <option value="">No section</option>
        {sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
        <option value="__new_section__">New section…</option>
      </select>{sectionDraft !== null ? <Input autoFocus className="h-7 w-48 text-xs" placeholder="Section name" value={sectionDraft} onChange={(event) => setSectionDraft(event.target.value)} /> : null}{sectionDraft !== null ? <Input className="h-7 w-64 text-xs" placeholder="Notion project link (optional)" value={notionDraft} onChange={(event) => setNotionDraft(event.target.value)} /> : null}</label>
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      {pending ? <p role="status" className="text-xs text-muted-foreground">Creating conversation…</p> : null}
    </DialogContent>
  </Dialog>;
}
