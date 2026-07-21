import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ConceptDetailsInlinePanel,
  type ConceptDetailsInlinePanelProps,
} from "@/components/ConceptDetailsInlinePanel";

type Props = Omit<ConceptDetailsInlinePanelProps, "active" | "variant" | "onClose"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ConceptDetailsDialog({ open, onOpenChange, ...props }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          props.editable
            ? "flex max-h-[90vh] max-w-6xl flex-col overflow-hidden"
            : "max-h-[85vh] max-w-3xl overflow-y-auto"
        }
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Concept: {props.conceptName || "Untitled"}</DialogTitle>
        </DialogHeader>
        <ConceptDetailsInlinePanel
          {...props}
          active={open}
          variant="dialog"
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
