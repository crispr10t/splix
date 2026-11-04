import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Lock,
  LockOpen,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Check,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function PinGateCard({
  groupMeta,
  metaLoading = false,
  onSubmit,
  loading = false
}) {
  const [pin, setPin] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);

  const inputRef = useRef(null);

  // Auto focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  async function attemptSubmit(code) {
    if (loading || isUnlocked) return;
    setErrorMessage("");

    const result = await onSubmit(code);
    if (result && result.ok) {
      setIsUnlocked(true);
    } else {
      setIsShaking(true);
      setErrorMessage(result?.error || "Incorrect PIN. Please try again.");
      setTimeout(() => {
        setIsShaking(false);
        setPin("");
        inputRef.current?.focus();
      }, 450);
    }
  }

  const handlePinChange = async (event) => {
    const cleaned = event.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(cleaned);
    if (errorMessage) {
      setErrorMessage("");
    }

    // Auto submit upon entering 4 digits
    if (cleaned.length === 4) {
      await attemptSubmit(cleaned);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const digits = [0, 1, 2, 3];

  return (
    <>
      <div
        className={cn(
          "mx-auto max-w-sm rounded-2xl border border-ink-200/90 bg-white p-6 sm:p-7 shadow-sm transition-colors duration-150",
          isShaking && "animate-shake"
        )}
      >
        {/* Proportional Lock Icon Container */}
        <div
          className={cn(
            "mx-auto flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm border transition-colors duration-150 duration-300 mb-3",
            isUnlocked
              ? "bg-leaf-600 text-white border-leaf-500 scale-105 shadow-leaf-600/20"
              : "bg-leaf-100/90 text-leaf-800 border-leaf-200/60"
          )}
        >
          {isUnlocked ? (
            <LockOpen className="h-6 w-6 animate-in zoom-in-75 duration-200" />
          ) : loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-leaf-800" />
          ) : (
            <Lock className="h-6 w-6 text-leaf-800" />
          )}
        </div>

        {/* Dynamic Title (Group Name) */}
        {metaLoading ? (
          <div className="h-7 w-40 mx-auto bg-ink-200/80 animate-pulse rounded-lg my-1" />
        ) : (
          <h2
            className={cn(
              "font-bold text-center text-ink-900 tracking-tight break-words [overflow-wrap:anywhere] line-clamp-2 px-1",
              groupMeta?.name && groupMeta.name.length > 20
                ? "text-lg sm:text-xl"
                : "text-xl sm:text-2xl"
            )}
            title={groupMeta?.name}
          >
            {groupMeta?.name ? `Unlock “${groupMeta.name}”` : "Unlock Group"}
          </h2>
        )}

        {/* Minimal Subtitle */}
        {groupMeta && (
          <p className="mt-1 text-center text-xs font-medium text-ink-400">
            {groupMeta.participantCount} {groupMeta.participantCount === 1 ? "member" : "members"} · {groupMeta.currency}
          </p>
        )}

        {/* PIN Input & Submit Section */}
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (pin.length === 4) {
              attemptSubmit(pin);
            }
          }}
        >
          <div className="space-y-2">
            <div
              onClick={handleContainerClick}
              className="relative flex items-center justify-center gap-2.5 sm:gap-3 py-1 cursor-pointer"
            >
              {/* Invisible native input for keyboard & accessibility */}
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus
                autoComplete="one-time-code"
                value={pin}
                disabled={loading || isUnlocked}
                onChange={handlePinChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="sr-only"
                aria-label="4-digit PIN"
              />

              {digits.map((index) => {
                const char = pin[index];
                const isCurrent = isFocused && pin.length === index && !loading;
                const isFilled = Boolean(char);

                return (
                  <div
                    key={index}
                    className={cn(
                      "relative flex h-14 w-12 sm:h-16 sm:w-14 items-center justify-center rounded-2xl border-2 text-2xl sm:text-3xl font-bold font-mono transition-colors duration-150 duration-150 select-none",
                      errorMessage
                        ? "border-danger-400 bg-danger-50/40 text-danger-600 ring-4 ring-danger-400/15"
                        : isCurrent
                        ? "border-leaf-600 bg-leaf-50/20 ring-4 ring-leaf-500/15 scale-105"
                        : isFilled
                        ? "border-ink-300 bg-white text-ink-900 shadow-sm"
                        : "border-ink-200 bg-ink-50/60 text-ink-300 hover:border-ink-300"
                    )}
                  >
                    {isFilled ? (
                      <span className="text-ink-900 font-bold animate-in zoom-in-75 duration-100">
                        {char}
                      </span>
                    ) : isCurrent ? (
                      <span className="h-6 w-0.5 animate-pulse bg-leaf-600 rounded-full" />
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-danger-600 animate-in fade-in slide-in-from-top-1 duration-150">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className={cn(
              "w-full h-11 text-sm font-semibold rounded-xl text-white shadow-md transition-colors duration-150 active:scale-[0.99]",
              isUnlocked
                ? "bg-leaf-600 hover:bg-leaf-600"
                : "bg-leaf-600 hover:bg-leaf-700"
            )}
            disabled={loading || pin.length !== 4 || isUnlocked}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying PIN…
              </span>
            ) : isUnlocked ? (
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 stroke-[3]" />
                Unlocked!
              </span>
            ) : (
              "Unlock Group"
            )}
          </Button>

          {/* Minimal Footer Navigation */}
          <div className="pt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-ink-400">
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-ink-400 hover:text-ink-700 transition-colors hover:underline inline-flex items-center gap-1"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Forgot PIN?
            </button>

            {groupMeta?.viewId && (
              <>
                <span className="text-ink-300">•</span>
                <Link
                  to={`/view/${groupMeta.viewId}`}
                  className="text-leaf-700 hover:text-leaf-800 hover:underline font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <span>Read-only view</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </>
            )}
          </div>
        </form>
      </div>

      {/* Forgot PIN Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 mb-2">
              <HelpCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center font-bold text-ink-900">
              How to Find Your PIN
            </DialogTitle>
            <DialogDescription className="text-center text-ink-500">
              Splix is privacy-first and doesn&apos;t store user emails or passwords.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm text-ink-600">
            <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-ink-50/70 p-3.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf-100 text-xs font-bold text-leaf-800">
                1
              </span>
              <p className="text-xs leading-relaxed text-ink-600">
                <strong className="text-ink-900 font-semibold">Ask the creator:</strong> Check
                with the person who created this group or originally shared the link.
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-ink-50/70 p-3.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf-100 text-xs font-bold text-leaf-800">
                2
              </span>
              <p className="text-xs leading-relaxed text-ink-600">
                <strong className="text-ink-900 font-semibold">Check chat history:</strong> Search
                WhatsApp or Telegram messages for the 4-digit code sent with the group link.
              </p>
            </div>

            {groupMeta?.viewId && (
              <div className="flex items-start gap-3 rounded-2xl border border-leaf-100 bg-leaf-50/60 p-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf-200 text-xs font-bold text-leaf-900">
                  3
                </span>
                <div className="text-xs leading-relaxed text-ink-700">
                  <strong className="text-leaf-950 font-semibold">Read-only view:</strong> Anyone
                  can see expenses and who owes what without needing the PIN.
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {groupMeta?.viewId && (
              <Button
                asChild
                variant="outline"
                className="w-full sm:w-auto text-xs font-medium rounded-xl border-leaf-200 text-leaf-800 hover:bg-leaf-50"
                onClick={() => setForgotOpen(false)}
              >
                <Link to={`/view/${groupMeta.viewId}`}>Go to Read-Only View</Link>
              </Button>
            )}
            <Button
              type="button"
              className="w-full sm:w-auto text-xs font-semibold rounded-xl bg-ink-900 text-white hover:bg-ink-800"
              onClick={() => setForgotOpen(false)}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
