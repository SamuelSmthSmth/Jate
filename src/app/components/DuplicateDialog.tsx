import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Job } from "../../app/types";

export default function DuplicateDialog({
  open,
  onOpenChange,
  duplicates,
  onAddAnyway,
  onReplace,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: Job[];
  onAddAnyway: () => void;
  onReplace: () => void;
}) {
  const first = duplicates[0];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/25 backdrop-blur-[1px] z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card rounded-2xl border border-border shadow-xl p-6 focus:outline-none">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold text-foreground">
              Possible duplicate
            </Dialog.Title>
            <Dialog.Close className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            You already have{" "}
            <span className="text-foreground font-medium">
              {first?.company ?? ""}{first?.role ? ` · ${first.role}` : ""}
            </span>{" "}
            in your list{duplicates.length > 1 ? ` (${duplicates.length} matching applications)` : ""}. You may want to remove the existing one instead of adding another.
          </p>

          {duplicates.length > 1 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {duplicates.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 text-xs rounded-lg border border-border px-3 py-2">
                  <span className="text-foreground truncate">
                    {d.company}{d.role ? ` · ${d.role}` : ""}
                  </span>
                  <span className="text-muted-foreground font-mono shrink-0">{d.status}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col sm:flex-row gap-2 justify-end mt-5 pt-4 border-t border-border">
            <Dialog.Close asChild>
              <button className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={onReplace}
              className="px-4 py-2 rounded-md border border-border text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-95 transition-all duration-200 ease-in-out"
            >
              Replace existing
            </button>
            <button
              onClick={onAddAnyway}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Add anyway
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
