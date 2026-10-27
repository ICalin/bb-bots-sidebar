import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

/**
 * One-click completion beside the archive button. Completed conversations
 * leave the bot's list until new activity reopens them.
 */
export function ConversationCompleteCheckbox({ thread, completed, disabled, onChange }: {
  thread: PluginSidebarThread; completed: boolean; disabled?: boolean; onChange: (completed: boolean) => void;
}) {
  const title = thread.displayTitle ?? thread.title ?? thread.titleFallback ?? "Untitled conversation";
  const label = disabled ? "Working conversations cannot be completed" : completed ? "Mark incomplete" : "Mark complete";
  return <Tooltip>
    <TooltipTrigger asChild>
      <Button type="button" variant="ghost" size="icon" role="checkbox" aria-checked={completed} className="conversation-complete h-6 w-6 shrink-0 p-0 text-muted-foreground" data-completed={completed}
        aria-label={`${completed ? "Mark incomplete" : "Mark complete"}: ${title}`} data-complete-thread-id={thread.id}
        disabled={disabled}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") event.stopPropagation(); }}
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); onChange(!completed); }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2.25" y="2.25" width="11.5" height="11.5" rx="3" />
          {completed ? <path d="M5 8.2l2 2 4-4.4" /> : null}
        </svg>
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>;
}
