import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

type EditItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void | Promise<void>;
  saving?: boolean;
  multiline?: boolean;
  saveLabel?: string;
};

export function EditItemDialog({
  open,
  onOpenChange,
  title,
  label,
  value,
  onChange,
  onSave,
  saving = false,
  multiline = false,
  saveLabel = "Save",
}: EditItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>{label}</Label>
          {multiline ? (
            <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className="resize-y" />
          ) : (
            <Input value={value} onChange={(e) => onChange(e.target.value)} />
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void Promise.resolve(onSave())} disabled={saving || !value.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
