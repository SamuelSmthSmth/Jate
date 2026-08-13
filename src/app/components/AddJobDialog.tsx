import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { Status, STATUSES } from "../../app/types";

export type AddJobForm = {
  company: string;
  role: string;
  location: string;
  status: Status;
  deadline: string;
  notes: string;
};

export default function AddJobDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: AddJobForm;
  setForm: React.Dispatch<React.SetStateAction<AddJobForm>>;
  onAdd: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />Add Job
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/25 backdrop-blur-[1px] z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card rounded-2xl border border-border shadow-xl p-6 focus:outline-none"
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-foreground">Add Application</Dialog.Title>
            <Dialog.Close className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Company *</label>
                <input type="text" value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  placeholder="Acme Corp"
                  className="px-3 py-2 rounded-md border border-border bg-input-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Role *</label>
                <input type="text" value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="Software Engineer"
                  className="px-3 py-2 rounded-md border border-border bg-input-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Location</label>
                <input type="text" value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Remote"
                  className="px-3 py-2 rounded-md border border-border bg-input-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Status</label>
                <select value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Status }))}
                  className="px-3 py-2 rounded-md border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Application Deadline</label>
              <input type="date" value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="px-3 py-2 rounded-md border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Notes</label>
              <textarea value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Referral from Jane, recruiter contact..."
                rows={3}
                className="px-3 py-2 rounded-md border border-border bg-input-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-border">
            <Dialog.Close asChild>
              <button className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out">
                Cancel
              </button>
            </Dialog.Close>
            <button onClick={onAdd}
              disabled={!form.company.trim() || !form.role.trim()}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
              Add Application
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
