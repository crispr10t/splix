import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { isValidUpiId, normalizeUpiId } from "@/utils/upiValidation";

export function AddParticipantDialog({ open, onOpenChange, onAdd, adding }) {
  const [name, setName] = useState("");
  const [upiId, setUpiId] = useState("");

  async function submit(e) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error("Please enter a name");
      return;
    }

    const normalizedUpi = normalizeUpiId(upiId);
    if (normalizedUpi && !isValidUpiId(normalizedUpi)) {
      toast.error("Enter a valid UPI ID (e.g. name@bank)");
      return;
    }

    try {
      await onAdd({
        name: cleanName,
        upiId: normalizedUpi || undefined
      });
      setName("");
      setUpiId("");
      onOpenChange(false);
    } catch {
      // Error handled in parent onAdd
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-leaf-100 text-leaf-800 mb-2">
            <UserPlus className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Add Group Member</DialogTitle>
          <DialogDescription className="text-center">
            Add a new friend or roommate to this group. They can be included in future expenses and settlements.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-normal text-ink-500">
              Person&apos;s Name *
            </label>
            <Input
              autoFocus
              maxLength={32}
              placeholder="e.g. Charlie, Priya, Rohan"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-normal text-ink-500">
              UPI ID (Optional)
            </label>
            <Input
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              placeholder="e.g. name@okaxis or 9876543210@paytm"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
            <p className="text-[11px] text-ink-500">
              Can be added or updated later anytime.
            </p>
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl text-xs sm:text-sm font-semibold"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl bg-leaf-600 hover:bg-leaf-700 text-white text-xs sm:text-sm font-semibold"
              disabled={adding || !name.trim()}
            >
              {adding ? "Adding…" : "Add Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
