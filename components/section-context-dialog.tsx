import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SECTION_CONTEXT_MAX, type SectionContextPatch } from "../lib/section-context";

export function SectionContextDialog({ heading, text: initialText, slackChannel: initialSlack, onSave, onClose }: {
  heading: string; text: string; slackChannel: string; onSave: (patch: SectionContextPatch) => Promise<void>; onClose: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [slack, setSlack] = useState(initialSlack);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    if (pending) return;
    setPending(true); setError(null);
    try { await onSave({ text, slackChannel: slack.trim() || null }); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setPending(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader><DialogTitle>{heading}</DialogTitle><DialogDescription>Rules added to the first message of every new conversation in this section.</DialogDescription></DialogHeader>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">Rules (markdown) <span className="font-normal tabular-nums">{text.length}/{SECTION_CONTEXT_MAX}</span>
          <textarea autoFocus rows={18} maxLength={SECTION_CONTEXT_MAX} value={text} onChange={(event) => setText(event.target.value)} className="block w-full resize-y rounded-md border border-input bg-transparent p-2 font-mono text-xs text-foreground" />
        </label>
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">Slack channel <span className="font-normal">(URL or id, optional)</span>
          <Input value={slack} onChange={(event) => setSlack(event.target.value)} />
        </label>
        {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" disabled={pending}>Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
