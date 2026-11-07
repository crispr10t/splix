import { useEffect, useState, useMemo } from "react";
import { Check, Trash2, AlertCircle } from "lucide-react";
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

/**
 * Authentic UPI mark with dual directional arrows (orange/green) and bold typography
 */
export function UpiLogoBadge({ className = "h-3.5" }) {
  return (
    <span className="inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded shadow-2xs shrink-0 select-none">
      <svg
        className={className}
        viewBox="0 0 46 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M2 1.5L8.5 8L2 14.5H6.2L12.7 8L6.2 1.5H2Z" fill="#F47920" />
        <path d="M8 1.5L14.5 8L8 14.5H12.2L18.7 8L12.2 1.5H8Z" fill="#0FA958" />
        <text
          x="21"
          y="12.5"
          fill="#1E293B"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
          fontWeight="800"
          fontSize="11.5"
          letterSpacing="0.4"
        >
          UPI
        </text>
      </svg>
    </span>
  );
}

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
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl p-5 border-ink-200">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2.5">
            <UserAvatar name={participant.name} size="sm" className="h-7 w-7 text-xs shrink-0" />
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-ink-900 tracking-tight leading-tight">
                UPI ID
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-500 truncate">
                For <span className="font-semibold text-ink-800">{participant.name}</span> to receive payments
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
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
                  Active ✓
                </span>
              )}
            </div>

            <div className="relative">
              <Input
                id="upi-id-input"
                autoFocus
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
                className={`h-10 pr-10 text-sm font-medium transition-colors ${
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

            {showError && (
              <p className="text-[11px] font-medium text-danger-600">
                Enter a valid UPI ID (e.g. mobile@upi or name@bank)
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              className="w-full h-10 bg-leaf-600 hover:bg-leaf-700 text-white rounded-xl shadow-xs text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              disabled={saving || (Boolean(normalized) && !isValid) || (!isDirty && hasExisting)}
              onClick={handleSave}
            >
              <UpiLogoBadge />
              <span>{saving ? "Saving…" : hasExisting ? "Update UPI ID" : "Save UPI ID"}</span>
            </Button>

            {hasExisting && (
              <Button
                type="button"
                variant="ghost"
                className="w-full h-8 text-xs text-danger-600 hover:text-danger-700 hover:bg-danger-50 rounded-lg gap-1.5 font-medium transition-colors"
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
