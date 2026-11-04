import { useEffect, useState } from "react";
import { Check, QrCode, User, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

export function ParticipantProfileDialog({
  open,
  onOpenChange,
  participant,
  saving,
  onChangePerson,
  onSave
}) {
  const [upiId, setUpiId] = useState(participant?.upiId || "");

  useEffect(() => {
    setUpiId(participant?.upiId || "");
  }, [participant?.id, participant?.upiId]);

  if (!participant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-leaf-100 text-leaf-800 mb-2">
            <UserCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Participant Profile</DialogTitle>
          <DialogDescription className="text-center">
            You are managing expenses as <strong className="text-ink-900 font-semibold">{participant.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* UPI Setup */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-normal text-ink-500">
              Your UPI ID (Optional)
            </label>
            <div className="relative">
              <Input
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                placeholder="e.g. yourname@okaxis or 9876543210@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-ink-500">
              Adding your UPI ID allows other group members to pay you back directly with 1 tap or QR code.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              className="w-full bg-leaf-600 hover:bg-leaf-700 text-white rounded-xl shadow-sm text-sm font-semibold"
              disabled={saving}
              onClick={() => {
                onSave(upiId);
                onOpenChange(false);
              }}
            >
              {saving ? "Saving…" : "Save UPI ID"}
            </Button>

            <Button
              variant="ghost"
              className="w-full text-xs text-ink-600 hover:text-ink-900 rounded-xl"
              onClick={() => {
                onOpenChange(false);
                onChangePerson();
              }}
            >
              Switch Person / Not {participant.name}?
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Keep backward compatible export
export function ParticipantProfileCard(props) {
  return <ParticipantProfileDialog {...props} />;
}
