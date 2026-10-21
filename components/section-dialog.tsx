import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { isNotionUrl } from "../lib/section-notion-links";

export function SectionDialog({ heading, description, name: initialName = "", notionUrl: initialUrl = "", showName = true, onSave, onClose }: {
  heading: string;
  description: string;
  name?: string;
  notionUrl?: string;
  showName?: boolean;
  onSave: (fields: { name: string; notionUrl: string | null }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [notionUrl, setNotionUrl] = useState(initialUrl);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = notionUrl.trim();
  const invalid = Boolean(url) && !isNotionUrl(url);
  async function save() {
    if ((showName && !name.trim()) || invalid || pending) return;
    setPending(true); setError(null);
    try { await onSave({ name: name.trim(), notionUrl: url || null }); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setPending(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>{heading}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        {showName ? <label className="block space-y-1 text-xs font-medium text-muted-foreground">Name<Input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label> : null}
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">Notion project <span className="font-normal">(optional)</span>
          <Input autoFocus={!showName} placeholder="https://app.notion.com/p/…" value={notionUrl} onChange={(event) => setNotionUrl(event.target.value)} aria-invalid={invalid} />
        </label>
        {invalid ? <p className="text-xs text-destructive">Paste a Notion page link.</p> : null}
        {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" disabled={pending || invalid || (showName && !name.trim())}>Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
