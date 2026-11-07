import { useEffect, useState, useMemo } from "react";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import {
  isValidUpiId,
  normalizeUpiId,
  getUpiValidationMessage,
  POPULAR_UPI_HANDLES
} from "@/utils/upiValidation";
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
  const validationError = useMemo(() => {
    if (!showError) return null;
    return getUpiValidationMessage(normalized) || "Looks incomplete (e.g. yourname@okaxis)";
  }, [showError, normalized]);

  // Autocomplete handle suggestions
  const suggestedHandles = useMemo(() => {
    if (!upiInput) return POPULAR_UPI_HANDLES;
    const atIndex = upiInput.indexOf("@");
    if (atIndex === -1) {
      return POPULAR_UPI_HANDLES;
    }
    const query = upiInput.slice(atIndex).toLowerCase();
    if (query === "@") return POPULAR_UPI_HANDLES;
    return POPULAR_UPI_HANDLES.filter((h) => h.toLowerCase().startsWith(query));
  }, [upiInput]);

  const handleSelectHandle = (handleSuffix) => {
    const atIndex = upiInput.indexOf("@");
    const base = atIndex >= 0 ? upiInput.slice(0, atIndex) : upiInput;
    setUpiInput(`${base}${handleSuffix}`);
    setTouched(true);
  };

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
          <div className="flex items-center gap-3">
            <UserAvatar name={participant.name} size="md" className="h-9 w-9 text-xs shrink-0 shadow-2xs" />
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-ink-900 tracking-tight leading-tight">
                {hasExisting ? "Edit your UPI ID" : "Add your UPI ID"}
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-500 font-medium truncate mt-0.5">
                {participant.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* UPI Input Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="upi-id-input"
              className="text-xs font-semibold text-ink-800"
            >
              UPI ID
            </label>

            <div className="relative">
              <Input
                id="upi-id-input"
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                placeholder="yourname@okaxis"
                value={upiInput}
                onChange={(e) => {
                  setUpiInput(e.target.value);
                  setTouched(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isValid) {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                className={`h-11 pr-10 text-sm font-medium transition-colors border-ink-300 focus-visible:border-leaf-600 focus-visible:ring-2 focus-visible:ring-leaf-200 ${
                  isValid
                    ? "border-leaf-500 focus-visible:border-leaf-600"
                    : showError
                    ? "border-danger-400 focus-visible:border-danger-500 focus-visible:ring-danger-100"
                    : ""
                }`}
              />

              {/* Status indicator on the right edge */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                {isValid && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-leaf-100 text-leaf-700">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </span>
                )}
              </div>
            </div>

            {/* Smart inline validation hint */}
            {showError && (
              <p className="text-[11px] font-medium text-danger-600">
                {validationError}
              </p>
            )}

            {/* Quick Autocomplete Chips (shown when typing before completing handle) */}
            {!isValid && suggestedHandles.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                {suggestedHandles.slice(0, 6).map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    onClick={() => handleSelectHandle(handle)}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-ink-50 hover:bg-leaf-50 hover:text-leaf-800 hover:border-leaf-300 border border-ink-200/80 text-ink-600 transition-colors cursor-pointer select-none"
                  >
                    {handle}
                  </button>
                ))}
              </div>
            )}

            {/* Helper value statement */}
            <p className="text-xs text-ink-500 pt-0.5">
              Friends can pay you in one tap or by QR.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col items-center gap-2 pt-1">
            <Button
              className="w-full h-11 bg-leaf-600 hover:bg-leaf-700 text-white rounded-xl shadow-xs text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={saving || !isValid || (!isDirty && hasExisting)}
              onClick={handleSave}
            >
              <Check className="h-4 w-4 stroke-[2.5]" />
              <span>{saving ? "Saving…" : "Save UPI ID"}</span>
            </Button>

            {hasExisting && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs text-danger-600 hover:text-danger-700 hover:underline font-medium transition-colors cursor-pointer py-1"
                disabled={saving}
                onClick={handleRemove}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove UPI ID</span>
              </button>
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
