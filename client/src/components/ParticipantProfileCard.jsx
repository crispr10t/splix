import { useEffect, useState, useMemo } from "react";
import { Check, Lock, QrCode, Trash2, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import { isValidUpiId, normalizeUpiId } from "@/utils/upiValidation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";

export function ParticipantProfileDialog({
  open,
  onOpenChange,
  participant,
  saving,
  onChangePerson,
  onSave
}) {
  const [upiInput, setUpiInput] = useState(participant?.upiId || "");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setUpiInput(participant?.upiId || "");
    setTouched(false);
  }, [participant?.id, participant?.upiId, open]);

  const normalized = useMemo(() => normalizeUpiId(upiInput), [upiInput]);
  const hasExisting = Boolean(participant?.upiId);
  const isValid = useMemo(() => {
    if (!normalized) return false;
    return isValidUpiId(normalized);
  }, [normalized]);

  const isDirty = normalized !== normalizeUpiId(participant?.upiId || "");
  const showError = touched && Boolean(normalized) && !isValid;

  const handleSave = () => {
    if (!isValid && normalized) return;
    onSave(normalized);
    onOpenChange(false);
  };

  const handleRemove = () => {
    onSave("");
    onOpenChange(false);
  };

  if (!participant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm sm:max-w-md rounded-3xl p-5 sm:p-6 border-ink-200">
        <DialogHeader className="text-center sm:text-center items-center">
          {/* Participant Avatar Hero */}
          <div className="relative mb-2">
            <UserAvatar
              name={participant.name}
              size="lg"
              className="h-14 w-14 text-base shadow-sm ring-4 ring-leaf-100/60"
            />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-leaf-600 text-white shadow-xs">
              <QrCode className="h-3 w-3" />
            </span>
          </div>

          <DialogTitle className="text-lg sm:text-xl font-bold text-ink-900 tracking-tight text-center">
            Set Up UPI ID
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-500 max-w-xs mx-auto text-center mt-1">
            Allow group members to settle debts directly with 1 tap or QR code as{" "}
            <span className="font-semibold text-ink-800">{participant.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* UPI Input Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="upi-id-input"
                className="text-xs font-semibold text-ink-700"
              >
                UPI ID / VPA
              </label>
              {hasExisting && (
                <span className="text-[11px] font-medium text-leaf-700">
                  Currently active ✓
                </span>
              )}
            </div>

            <div className="relative">
              <Input
                id="upi-id-input"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                placeholder="e.g. mobile@upi or name@okhdfc"
                value={upiInput}
                onChange={(e) => {
                  setUpiInput(e.target.value);
                  setTouched(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (isValid || !normalized)) {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                className={`h-11 pr-10 text-sm font-medium transition-colors ${
                  isValid
                    ? "border-leaf-500 focus-visible:border-leaf-600 focus-visible:ring-leaf-200"
                    : showError
                    ? "border-danger-400 focus-visible:border-danger-500 focus-visible:ring-danger-100"
                    : ""
                }`}
              />

              {/* Status indicator on the right edge */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                {isValid ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-leaf-100 text-leaf-700">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </span>
                ) : showError ? (
                  <AlertCircle className="h-4 w-4 text-danger-500" />
                ) : null}
              </div>
            </div>

            {/* Microcopy & Error Messages */}
            {showError ? (
              <p className="text-[11px] font-medium text-danger-600">
                Format should be username@bank (e.g. 9876543210@paytm or name@okaxis)
              </p>
            ) : (
              <p className="text-[11px] text-ink-400">
                Works with Google Pay, PhonePe, Paytm, or BHIM.
              </p>
            )}

            {/* Privacy trust badge */}
            <div className="flex items-center gap-1.5 text-[11px] text-ink-500 bg-ink-50/80 px-2.5 py-1.5 rounded-xl border border-ink-100 mt-2">
              <Lock className="h-3.5 w-3.5 text-ink-400 shrink-0" />
              <span>Visible only to people with this group link.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              className="w-full h-11 bg-leaf-600 hover:bg-leaf-700 text-white rounded-xl shadow-xs text-sm font-semibold transition-all disabled:opacity-40"
              disabled={saving || (Boolean(normalized) && !isValid) || (!isDirty && hasExisting)}
              onClick={handleSave}
            >
              {saving ? "Saving…" : hasExisting ? "Update UPI ID" : "Save UPI ID"}
            </Button>

            {hasExisting && (
              <Button
                type="button"
                variant="ghost"
                className="w-full h-9 text-xs text-danger-600 hover:text-danger-700 hover:bg-danger-50 rounded-xl gap-1.5 font-medium transition-colors"
                disabled={saving}
                onClick={handleRemove}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove UPI ID</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Backward compatible export
export function ParticipantProfileCard(props) {
  return <ParticipantProfileDialog {...props} />;
}
