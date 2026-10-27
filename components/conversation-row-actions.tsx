import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { ConversationArchiveButton } from "./conversation-archive-button";
import { ConversationCompleteCheckbox } from "./conversation-complete-checkbox";

/**
 * The right edge of a bot conversation row: the complete checkbox, with
 * archive revealed directly below it while the pointer or keyboard focus is
 * on the checkbox. Touch has no hover, so archive lives in the long-press menu.
 */
export function ConversationRowActions({ thread, completed, disabled, onChange }: {
  thread: PluginSidebarThread; completed: boolean; disabled?: boolean; onChange: (completed: boolean) => void;
}) {
  return <div className="conversation-actions">
    <ConversationCompleteCheckbox thread={thread} completed={completed} disabled={disabled} onChange={onChange} />
    <div className="conversation-actions-menu"><ConversationArchiveButton thread={thread} /></div>
  </div>;
}
