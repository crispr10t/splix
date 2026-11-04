import { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  History,
  QrCode,
  RotateCcw,
  Sparkles,
  Trash2,
  Wallet,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, money } from "@/utils/format";
import { buildQrUrl, buildUpiLink } from "@/utils/upi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

export function SettlementList({
  settlements = [],
  settlementHistory = [],
  participants = [],
  balances = [],
  currency,
  groupName,
  onRecordSettlement,
  onDeleteSettlement,
  readOnly = false
}) {
  const [activeItem, setActiveItem] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [settleNote, setSettleNote] = useState("");
  const [recording, setRecording] = useState(false);
  const byId = new Map(participants.map((p) => [p.id, p]));

  async function copyText(text, label = "Copied to clipboard") {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  }

  function openUpi(upiLink) {
    window.location.href = upiLink;
  }

  const activePayee = activeItem ? byId.get(activeItem.toParticipantId) : null;
  const activePayer = activeItem ? byId.get(activeItem.fromParticipantId) : null;
  const hasUpi = Boolean(activePayee?.upiId);
  const upiLink = activeItem && hasUpi
    ? buildUpiLink({
        upiId: activePayee.upiId,
        name: activePayee.name,
        amountMinor: activeItem.amountMinor
      })
    : "";

  async function handleConfirmPayment() {
    if (!activeItem || !onRecordSettlement) return;
    setRecording(true);
    try {
      await onRecordSettlement({
        fromParticipantId: activeItem.fromParticipantId,
        toParticipantId: activeItem.toParticipantId,
        amountMinor: activeItem.amountMinor,
        note: settleNote.trim() || undefined
      });
      setActiveItem(null);
      setSettleNote("");
      setShowQr(false);
    } catch {
      // Error handled in parent
    } finally {
      setRecording(false);
    }
  }

  const totalSettledMinor = settlementHistory.reduce((sum, s) => sum + s.amountMinor, 0);

  return (
    <div className="space-y-5">
      {/* Net Balances Overview Chips */}
      {balances && balances.length > 0 && (
        <div className="rounded-2xl border border-ink-200/90 bg-white/90 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-normal text-ink-500">
            <Sparkles className="h-3.5 w-3.5 text-leaf-600" />
            <span>Net Balances</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {balances.map((b) => {
              const isPositive = b.netMinor > 0;
              const isZero = b.netMinor === 0;
              return (
                <div
                  key={b.participantId}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border ${
                    isZero
                      ? "border-ink-200 bg-ink-50 text-ink-600"
                      : isPositive
                      ? "border-leaf-200 bg-leaf-50 text-leaf-900"
                      : "border-danger-200 bg-danger-50 text-danger-900"
                  }`}
                >
                  <span className="font-semibold">{b.participantName}:</span>
                  <span>
                    {isPositive ? "+" : ""}
                    {money(b.netMinor, currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Outstanding Debts Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-normal text-ink-500">
            Outstanding Debts ({settlements.length})
          </h3>
          {settlements.length === 0 && (
            <Badge variant="success" className="gap-1">
              <Check className="h-3 w-3" />
              All Debts Settled
            </Badge>
          )}
        </div>

        {!settlements.length ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-8 text-center text-ink-500 text-sm">
            <CheckCircle2 className="mx-auto h-8 w-8 text-leaf-600 mb-2" />
            <p className="font-semibold text-ink-900">All balances are even!</p>
            <p className="mt-1 text-xs text-ink-500">
              No one owes money in this group right now.
            </p>
          </div>
        ) : null}

        {settlements.map((item) => {
          const payee = byId.get(item.toParticipantId);
          const payer = byId.get(item.fromParticipantId);
          const rowKey = `${item.fromParticipantId}-${item.toParticipantId}-${item.amountMinor}`;

          return (
            <div
              key={rowKey}
              onClick={() => {
                setActiveItem(item);
                setShowQr(false);
                setSettleNote("");
              }}
              className="group flex cursor-pointer items-center justify-between rounded-2xl border border-ink-200 bg-white p-3.5 sm:p-4 transition-colors duration-150 hover:border-leaf-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Payer Avatar */}
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs bg-ink-100 text-ink-800">
                    {item.fromName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Transfer Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-ink-900">
                    <span className="truncate">{item.fromName}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-ink-400 shrink-0" />
                    <span className="truncate text-leaf-800">{item.toName}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {payee?.upiId ? "UPI enabled" : "Cash / Bank Transfer"}
                  </p>
                </div>
              </div>

              {/* Amount & Settle Button */}
              <div className="flex items-center gap-2.5 shrink-0 pl-2">
                <span className="text-sm sm:text-base font-bold text-ink-900">
                  {money(item.amountMinor, currency)}
                </span>

                {!readOnly && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-semibold rounded-xl border-leaf-300 text-leaf-800 hover:bg-leaf-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveItem(item);
                      setShowQr(false);
                      setSettleNote("");
                    }}
                  >
                    Settle Up
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completed Payments Ledger Section */}
      {settlementHistory && settlementHistory.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-semibold tracking-normal text-ink-500">
              <History className="h-4 w-4 text-leaf-600" />
              <span>Payment History ({settlementHistory.length})</span>
            </div>
            <Badge variant="outline" className="text-xs text-leaf-800 font-semibold bg-leaf-50 border-leaf-200">
              Settled: {money(totalSettledMinor, currency)}
            </Badge>
          </div>

          <div className="space-y-2">
            {settlementHistory.map((historyItem) => (
              <div
                key={historyItem.id}
                className="flex items-center justify-between rounded-2xl border border-ink-200/80 bg-ink-50/70 p-3 sm:p-3.5 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-leaf-100 text-leaf-700">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900 truncate">
                      <strong>{historyItem.fromName}</strong> paid <strong>{historyItem.toName}</strong>
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
                      <span>{formatDateTime(historyItem.date || historyItem.createdAt)}</span>
                      {historyItem.note && (
                        <>
                          <span>&bull;</span>
                          <span className="italic text-ink-600">&ldquo;{historyItem.note}&rdquo;</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <span className="font-bold text-ink-900 text-xs sm:text-sm">
                    {money(historyItem.amountMinor, currency)}
                  </span>
                  {!readOnly && onDeleteSettlement && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-ink-400 hover:text-danger-600 rounded-lg"
                      title="Undo payment"
                      onClick={() => onDeleteSettlement(historyItem.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settle Up Action Modal */}
      {activeItem && (
        <Dialog open={Boolean(activeItem)} onOpenChange={(open) => !open && setActiveItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center sm:text-left">Settle Payment</DialogTitle>
              <DialogDescription className="text-center sm:text-left">
                {activeItem.fromName} owes {activeItem.toName}
              </DialogDescription>
            </DialogHeader>

            <div className="my-2 rounded-2xl border border-leaf-200 bg-leaf-50/70 p-4 text-center">
              <span className="text-xs tracking-normal text-leaf-800 font-semibold">Total Amount</span>
              <p className="mt-1 text-3xl font-extrabold text-leaf-950">
                {money(activeItem.amountMinor, currency)}
              </p>
            </div>

            {/* UPI Payment options if available */}
            {hasUpi ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-ink-200 bg-ink-50 p-2.5 text-xs">
                  <div>
                    <span className="text-ink-500">UPI ID: </span>
                    <span className="font-semibold text-ink-900 font-mono">{activePayee.upiId}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2"
                    onClick={() => copyText(activePayee.upiId, "UPI ID copied")}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </Button>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    className="h-12 w-full bg-leaf-600 hover:bg-leaf-700 text-white rounded-xl shadow-sm text-sm font-semibold"
                    onClick={() => openUpi(upiLink)}
                  >
                    <Zap className="h-4 w-4 mr-1 text-leaf-200" />
                    Pay via UPI App
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full rounded-xl text-xs sm:text-sm font-semibold"
                    onClick={() => setShowQr((c) => !c)}
                  >
                    <QrCode className="h-4 w-4 mr-1" />
                    {showQr ? "Hide QR" : "Show QR code for a friend to scan"}
                  </Button>
                </div>

                {showQr && (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-ink-200 bg-white p-4">
                    <img
                      src={buildQrUrl(upiLink)}
                      alt="UPI QR Code"
                      className="h-44 w-44 rounded-xl border border-ink-200 p-1"
                    />
                    <p className="mt-2 text-xs text-ink-500">Scan using GPay, PhonePe, Paytm, or BHIM</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
                <p className="font-semibold">{activePayee?.name} hasn&apos;t added a UPI ID yet.</p>
                <p className="mt-0.5 text-amber-800/80">
                  You can pay via cash or net banking, then record the settlement below.
                </p>
              </div>
            )}

            {/* Optional payment note */}
            {!readOnly && (
              <div className="pt-2 space-y-1.5">
                <label className="text-xs font-semibold tracking-normal text-ink-500">
                  Payment Note (Optional)
                </label>
                <Input
                  placeholder="e.g. Paid via GPay, Cash handed over"
                  maxLength={100}
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                />
              </div>
            )}

            {/* Record Payment Button */}
            {!readOnly && onRecordSettlement && (
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  className="w-full rounded-xl bg-leaf-600 text-white hover:bg-leaf-700 font-semibold text-xs sm:text-sm h-11"
                  disabled={recording}
                  onClick={handleConfirmPayment}
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  {recording ? "Recording payment…" : "Record Payment (Zero Out Debt)"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
