Give recurring work a named specialist without tying its identity to one repository.

## What you get

- Named bots with configurable avatars, their own instructions, and up to 3,000 characters of durable memory.
- Per-bot defaults for new conversations: harness, model, reasoning, permissions, starter prompt, and checkout or fresh worktree.
- A sidebar that groups conversations by bot, keeps active work visible, and folds older chats into expandable trees.
- Drag-to-bot assignment for existing chats, plus inline complete and archive controls.
- Completed conversations leave the list; idle bot conversations complete automatically after 3 days, and completed ones can optionally be archived. A bot's first conversation is never completed or archived automatically.
- Bots unfold when you open one of their conversations or when they start working.
- Change a thread's bot, or remove it from one, from the thread header or its Info tab, where a folded Bot prompt section shows exactly what the bot adds to the system prompt.
- Handing off a bot conversation keeps the new thread with the same bot, in the same place.
- Running workflows appear as virtual children of the conversation that started them, with their agent threads one click away.
- Project membership and one optional owner per project to route new conversations. Existing conversation assignments stay intact.
- `@` completion for bot references and attributed asynchronous coordination through `bb bots list` and `bb bots message`.

## How it works

Use a bot's `+` to start a conversation in a project it owns, or a personal workspace when it owns none. BB's native composer lets you change the project and machine; a separate action creates a fresh worktree. Edit a bot's instructions, memory, settings, and project roles in one dialog.

Bot state lives in BB's private plugin storage, not in project files. Agents read and update their own state through `bot_read_state` and `bot_update_state`. Mentioning a bot does not send a message or reassign the current conversation by itself.

## Requirements

Requires BB 0.47.1 or newer with Plugin SDK 0.6.79 or newer and a configured agent provider. No additional account or external service is required; your provider's normal costs apply. Bot instructions and memory enter the provider's context when its conversations run. Plugins run with BB's full trust; bot membership is not a security boundary. Project-folder creation accepts POSIX paths (including WSL), not native Windows paths.
