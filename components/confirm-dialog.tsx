import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ConfirmDialog({ heading, description, confirmLabel, onConfirm, onClose }: {
  heading: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    setPending(true); setError(null);
    try { await onConfirm(); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setPending(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>{heading}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
        <Button variant="destructive" onClick={() => void confirm()} disabled={pending}>{confirmLabel}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
