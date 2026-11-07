import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  DollarSign,
  Equal,
  IndianRupee,
  Percent,
  Plus,
  Save,
  Users,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { PayerSelect } from "@/components/ui/payer-select";
import { DatePicker } from "@/components/ui/date-picker";
import { sortByName } from "@/utils/sort";
import { CATEGORIES, getCategory } from "@/utils/categories";
import { getCurrencySymbol, money } from "@/utils/format";
import { cn } from "@/lib/utils";

function isNumericDraft(value) {
  return /^\d*\.?\d*$/.test(value);
}

function toMinor(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? Math.round(num * 100) : 0;
}

function localDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildClientSplitJson({ amountMinor, mode, selectedIds, amountMap, percentMap }) {
  if (mode === "even") {
    const base = Math.floor(amountMinor / selectedIds.length);
    let remainder = amountMinor - base * selectedIds.length;
    const result = {};
    for (const participantId of selectedIds) {
      const extra = remainder > 0 ? 1 : 0;
      result[participantId] = base + extra;
      if (remainder > 0) remainder -= 1;
    }
    return result;
  }

  if (mode === "amount") {
    return Object.fromEntries(
      selectedIds.map((participantId) => [participantId, toMinor(amountMap[participantId] || 0)])
    );
  }

  const rows = selectedIds.map((participantId) => ({
    participantId,
    raw: (amountMinor * Number(percentMap[participantId] || 0)) / 100
  }));
  const result = {};
  let allocated = 0;

  for (const row of rows) {
    const floorValue = Math.floor(row.raw);
    result[row.participantId] = floorValue;
    allocated += floorValue;
  }

  let remainder = amountMinor - allocated;
  rows
    .slice()
    .sort((a, b) => (b.raw - Math.floor(b.raw)) - (a.raw - Math.floor(a.raw)))
    .forEach((row) => {
      if (remainder <= 0) return;
      result[row.participantId] += 1;
      remainder -= 1;
    });

  return result;
}

export function AddExpenseCard({
  participants,
  currency,
  defaultPayerId,
  initialExpense = null,
  onAdd,
  onUpdate,
  disabled,
  adding,
  onSuccess,
  onCancel,
  autoFocus = false
}) {
  const sortedParticipants = sortByName(participants);
  const isEditMode = Boolean(initialExpense);
  const currencySymbol = getCurrencySymbol(currency);

  const [title, setTitle] = useState(initialExpense?.title || "");
  const [amount, setAmount] = useState(
    initialExpense ? (initialExpense.amountMinor / 100).toFixed(2).replace(/\.00$/, "") : ""
  );
  const [paidByParticipantId, setPaidByParticipantId] = useState(
    initialExpense?.paidByParticipantId || defaultPayerId || ""
  );
  const [category, setCategory] = useState(initialExpense?.category || "general");
  const [date, setDate] = useState(
    initialExpense?.date
      ? initialExpense.date.slice(0, 10)
      : localDateInputValue()
  );

  const [mode, setMode] = useState("even");
  const [selectedIds, setSelectedIds] = useState([]);
  const [amountMap, setAmountMap] = useState({});
  const [percentMap, setPercentMap] = useState({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [amountError, setAmountError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const knownParticipantIdsRef = useRef([]);
  const titleInputRef = useRef(null);
  const amountInputRef = useRef(null);

  useEffect(() => {
    if (initialExpense) {
      setTitle(initialExpense.title || "");
      setAmount((initialExpense.amountMinor / 100).toFixed(2).replace(/\.00$/, ""));
      setPaidByParticipantId(initialExpense.paidByParticipantId || defaultPayerId || "");
      setCategory(initialExpense.category || "general");
      setDate(
        initialExpense.date
          ? initialExpense.date.slice(0, 10)
          : localDateInputValue()
      );

      const splitKeys = Object.keys(initialExpense.splitJson || {});
      if (splitKeys.length > 0) {
        setSelectedIds(splitKeys);
        // Pre-fill amountMap
        const newAmountMap = {};
        for (const [pId, shareMinor] of Object.entries(initialExpense.splitJson)) {
          newAmountMap[pId] = (shareMinor / 100).toFixed(2);
        }
        setAmountMap(newAmountMap);
      }
    }
  }, [initialExpense, defaultPayerId]);

  useEffect(() => {
    if (isEditMode) return;
    const participantIds = sortedParticipants.map((participant) => participant.id);
    const previousIds = knownParticipantIdsRef.current;
    const previousIdSet = new Set(previousIds);

    setSelectedIds((current) => {
      if (!current.length) return participantIds;
      const participantIdSet = new Set(participantIds);
      const retained = current.filter((id) => participantIdSet.has(id));
      const added = participantIds.filter((id) => !previousIdSet.has(id));
      return [...retained, ...added];
    });

    knownParticipantIdsRef.current = participantIds;
  }, [participants, isEditMode]);

  useEffect(() => {
    if (!isEditMode && defaultPayerId && !paidByParticipantId) {
      setPaidByParticipantId(defaultPayerId);
    }
  }, [defaultPayerId, isEditMode, paidByParticipantId]);

  useEffect(() => {
    setDetailsOpen(mode !== "even");
  }, [mode]);

  function toggleParticipant(participantId) {
    setSelectedIds((current) =>
      current.includes(participantId)
        ? current.filter((item) => item !== participantId)
        : [...current, participantId]
    );
  }

  function selectAll() {
    setSelectedIds(sortedParticipants.map((p) => p.id));
  }

  function updateNumericField(value, setter, errorKey, message) {
    setter(value);
    setFieldErrors((current) => {
      const next = { ...current };
      if (value === "" || isNumericDraft(value)) {
        delete next[errorKey];
      } else {
        next[errorKey] = message;
      }
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();

    if (!title.trim()) {
      setTitleError("Enter an expense title");
      titleInputRef.current?.focus();
      hapticTap([30, 50, 30]);
      return;
    }
    setTitleError("");

    const amountMinor = toMinor(amount);
    if (!amount || amountMinor <= 0) {
      setAmountError("Enter an amount");
      amountInputRef.current?.focus();
      hapticTap([30, 50, 30]);
      return;
    }

    if (!paidByParticipantId) {
      toast.error("Please select who paid");
      return;
    }

    if (selectedIds.length === 0) {
      toast.error("Select at least 1 person to split with");
      hapticTap([30, 50, 30]);
      return;
    }

    if (mode === "amount") {
      const splitTotalMinor = selectedIds.reduce(
        (sum, id) => sum + toMinor(amountMap[id] || 0),
        0
      );
      if (splitTotalMinor !== amountMinor) {
        toast.error(`Split amounts must total ${money(amountMinor, currency)}`);
        return;
      }
    }

    if (mode === "percentage") {
      const splitTotalPercent = selectedIds.reduce(
        (sum, id) => sum + Number(percentMap[id] || 0),
        0
      );
      if (Math.abs(splitTotalPercent - 100) > 0.01) {
        toast.error("Split percentages must total 100%");
        return;
      }
    }

    const splitEntries = selectedIds.map((participantId) => ({
      participantId,
      amountMinor: mode === "amount" ? toMinor(amountMap[participantId] || 0) : undefined,
      percent: mode === "percentage" ? Number(percentMap[participantId] || 0) : undefined
    }));
    const splitJson = buildClientSplitJson({
      amountMinor,
      mode,
      selectedIds,
      amountMap,
      percentMap
    });

    const payload = {
      title: title.trim(),
      amountMinor,
      paidByParticipantId,
      category,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      split: { mode, entries: splitEntries },
      splitJson
    };

    if (isEditMode && onUpdate) {
      await onUpdate(initialExpense.id, payload);
    } else {
      await onAdd(payload);
    }

    if (!isEditMode) {
      setTitle("");
      setAmount("");
      setPaidByParticipantId(defaultPayerId || "");
      setSelectedIds(sortedParticipants.map((p) => p.id));
      setCategory("general");
      setDate(localDateInputValue());
      setAmountMap({});
      setPercentMap({});
      setDetailsOpen(false);
      setAmountError("");
      setFieldErrors({});
    }

    if (onSuccess) {
      onSuccess();
    }
  }

  const perPersonShare = useMemo(() => {
    const totalMinor = toMinor(amount);
    return selectedIds.length > 0 && totalMinor > 0
      ? (totalMinor / selectedIds.length / 100).toFixed(2)
      : null;
  }, [amount, selectedIds]);

  // Live split status calculations for amount and percentage
  const splitStatus = useMemo(() => {
    const totalMinor = toMinor(amount);

    if (mode === "even") {
      if (perPersonShare) {
        return {
          type: "even",
          variant: "success",
          text: `${currencySymbol}${currencySymbol.length > 1 ? " " : ""}${perPersonShare} / person`
        };
      }
      return null;
    }

    if (mode === "amount") {
      if (totalMinor <= 0) return null;
      const assignedMinor = selectedIds.reduce(
        (sum, id) => sum + toMinor(amountMap[id] || 0),
        0
      );
      const diffMinor = totalMinor - assignedMinor;

      if (diffMinor === 0) {
        return {
          type: "balanced",
          variant: "success",
          text: "✓ Balanced"
        };
      }
      if (diffMinor > 0) {
        return {
          type: "remaining",
          variant: "warning",
          text: `${money(diffMinor, currency)} remaining`
        };
      }
      return {
        type: "over",
        variant: "destructive",
        text: `${money(Math.abs(diffMinor), currency)} over`
      };
    }

    if (mode === "percentage") {
      const assignedPercent = selectedIds.reduce(
        (sum, id) => sum + Number(percentMap[id] || 0),
        0
      );
      const diffPercent = 100 - assignedPercent;

      if (Math.abs(diffPercent) < 0.01) {
        return {
          type: "balanced",
          variant: "success",
          text: "✓ 100% allocated"
        };
      }
      if (diffPercent > 0) {
        const remainingStr = Number.isInteger(diffPercent) ? diffPercent : diffPercent.toFixed(1);
        return {
          type: "remaining",
          variant: "warning",
          text: `${remainingStr}% remaining`
        };
      }
      const overStr = Number.isInteger(Math.abs(diffPercent))
        ? Math.abs(diffPercent)
        : Math.abs(diffPercent).toFixed(1);
      return {
        type: "over",
        variant: "destructive",
        text: `${overStr}% over`
      };
    }

    return null;
  }, [mode, amount, selectedIds, amountMap, percentMap, currencySymbol, currency]);

  return (
    <form className="flex flex-col flex-1 min-h-0 h-full" onSubmit={submit}>
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-3 space-y-3.5">
        <div className="space-y-3">
        {/* Title input */}
        <div>
          <label className="text-xs font-semibold tracking-normal text-ink-500">
            Expense Title
          </label>
          <Input
            ref={titleInputRef}
            autoFocus={autoFocus}
            className="mt-1 text-sm sm:text-base font-medium"
            maxLength={60}
            placeholder="Dinner, cab ride, groceries…"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError(""); }}
          />
          {titleError && <p className="mt-1 text-xs text-danger-600">{titleError}</p>}
        </div>

        {/* Amount */}
        <div>
          <div>
            <label className="text-xs font-semibold tracking-normal text-ink-500">
              Amount
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-400 font-semibold text-sm">
                {currencySymbol}
              </span>
              <Input
                ref={amountInputRef}
                className={`${currencySymbol.length > 2 ? "pl-14" : "pl-9"} text-sm sm:text-base font-bold`}
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  const raw = e.target.value;
                  const val = raw.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                  setAmount(val);
                  setAmountError("");
                }}
              />
            </div>
            {amountError && <p className="mt-1 text-xs text-danger-600">{amountError}</p>}
          </div>
        </div>

        {/* Payer and date share one row on every viewport */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold tracking-normal text-ink-500 block mb-1">
              Paid By
            </label>
            <PayerSelect
              participants={sortedParticipants}
              value={paidByParticipantId}
              onChange={setPaidByParticipantId}
            />
          </div>
          {/* Expense Date Picker */}
          <div>
            <label className="text-xs font-semibold tracking-normal text-ink-500 block mb-1">
              Date
            </label>
            <DatePicker
              value={date}
              maxDate={localDateInputValue()}
              onChange={setDate}
            />
          </div>
        </div>

        {/* Quick Category Chips */}
        <div>
          <label className="text-xs font-semibold text-ink-500">Category</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <motion.button whileTap={{ scale: 0.93 }}
                  key={cat.id}
                  type="button"
                  className={`relative h-9 inline-flex items-center justify-center gap-1.5 px-3 text-xs font-medium rounded-full !rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 [-webkit-tap-highlight-color:transparent] ${
                    isSelected
                      ? "text-white font-semibold"
                      : "bg-ink-100/70 text-ink-700 hover:bg-ink-100"
                  }`}
                  onClick={() => setCategory(cat.id)}
                >
                  {isSelected && <motion.span layoutId="add-expense-category" className="absolute inset-0 -z-0 rounded-full bg-leaf-600 shadow-sm" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}
                  <Icon className="relative z-10 h-3.5 w-3.5 shrink-0" />
                  <span className="relative z-10 whitespace-nowrap">{cat.shortLabel || cat.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Split Mode Selector */}
      <div className="rounded-2xl border border-ink-200/90 bg-ink-50/70 p-3 sm:p-4">
        <div className="flex items-center justify-between min-h-[22px]">
          <label className="text-xs font-semibold tracking-normal text-ink-500">
            Split Method
          </label>
          {splitStatus && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all",
                splitStatus.variant === "success" && "border-leaf-200 bg-leaf-50 text-leaf-800",
                splitStatus.variant === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
                splitStatus.variant === "destructive" && "border-danger-200 bg-danger-50 text-danger-700"
              )}
            >
              {splitStatus.text}
            </span>
          )}
        </div>

        {/* Unified Segmented Control */}
        <div className="mt-2.5 flex items-center p-1.5 rounded-2xl bg-ink-200/60 border border-ink-200/50 gap-1.5" role="radiogroup" aria-label="Split method">
          {(() => {
            const SplitAmountIcon =
              currency === "INR" || currencySymbol === "₹"
                ? IndianRupee
                : currency === "USD" || currencySymbol === "$"
                ? DollarSign
                : Coins;
            return [
              { id: "even", label: "Equal", icon: Equal },
              { id: "amount", label: "Amount", icon: SplitAmountIcon },
              { id: "percentage", label: "Percent", icon: Percent }
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={cn(
                    "relative flex-1 h-10 sm:h-11 inline-flex items-center justify-center gap-1.5 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer select-none outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]",
                    isSelected
                      ? "text-white font-semibold"
                      : "text-ink-600 hover:text-ink-900 hover:bg-ink-200/40"
                  )}
                  onClick={() => setMode(item.id)}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="add-expense-split-method"
                      className="absolute inset-0 rounded-xl bg-leaf-600 shadow-xs"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <Icon className="relative z-10 h-4 w-4 shrink-0" />
                  <span className="relative z-10 truncate">{item.label}</span>
                </button>
              );
            });
          })()}
        </div>

        {/* Dynamic Helper Note */}
        <p className="mt-2 text-[11px] text-ink-500 px-0.5 font-medium">
          {mode === "even" && "Everyone pays an equal share."}
          {mode === "amount" && "Enter the exact amount paid for each person."}
          {mode === "percentage" && "Enter percentages totaling 100%."}
        </p>

        {/* Participants Selector Toggle */}
        <div className="mt-3.5 border-t border-ink-200/80 pt-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-700 hover:text-ink-900 cursor-pointer select-none"
              onClick={() => setDetailsOpen((c) => !c)}
            >
              <Users className="h-3.5 w-3.5 text-leaf-600 shrink-0" />
              <span>
                {selectedIds.length === sortedParticipants.length
                  ? `All members (${sortedParticipants.length})`
                  : `${selectedIds.length} of ${sortedParticipants.length} people included`}
              </span>
              {detailsOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-ink-400" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
              )}
            </button>
            {detailsOpen && selectedIds.length !== sortedParticipants.length && (
              <button
                type="button"
                className="text-xs font-semibold text-leaf-700 hover:underline cursor-pointer"
                onClick={selectAll}
              >
                Select all
              </button>
            )}
          </div>

          {detailsOpen && (
            <div className="mt-3 grid gap-2">
              {sortedParticipants.map((p) => {
                const checked = selectedIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-3 py-2 min-h-[50px] transition-colors duration-150 gap-2",
                      checked
                        ? "border-leaf-200/90 bg-white shadow-2xs"
                        : "border-ink-200/70 bg-ink-100/35"
                    )}
                  >
                    <label className="flex flex-1 min-w-0 cursor-pointer items-center gap-2.5 select-none">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleParticipant(p.id)}
                        className="sr-only"
                      />
                      {/* Custom Round Checkbox */}
                      <div
                        className={cn(
                          "h-5 w-5 rounded-full flex items-center justify-center transition-all shrink-0 border",
                          checked
                            ? "bg-leaf-600 border-leaf-600 text-white shadow-2xs"
                            : "bg-white border-ink-300 hover:border-ink-400"
                        )}
                        aria-hidden="true"
                      >
                        {checked && <Check className="h-3.5 w-3.5 stroke-[2.8]" />}
                      </div>

                      <UserAvatar
                        name={p.name}
                        size="xs"
                        className={cn("h-6 w-6 shrink-0 transition-opacity", !checked && "opacity-50")}
                      />
                      <span
                        className={cn(
                          "truncate text-xs sm:text-sm font-semibold transition-colors",
                          checked ? "text-ink-900" : "text-ink-400"
                        )}
                      >
                        {p.name}
                      </span>
                    </label>

                    {/* Right slot: guaranteed fixed dimensions for all states */}
                    {mode === "even" ? (
                      <div className="w-24 sm:w-28 h-8.5 shrink-0 flex items-center justify-end px-2 text-right">
                        {checked ? (
                          <span className="text-xs font-mono font-semibold text-leaf-700">
                            {currencySymbol}{currencySymbol.length > 1 ? " " : ""}{perPersonShare || "0.00"}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-ink-400 italic">
                            Excluded
                          </span>
                        )}
                      </div>
                    ) : (
                      checked ? (
                        <div className="w-28 sm:w-32 shrink-0">
                          <Input
                            className="h-8.5 text-xs sm:text-sm font-semibold font-mono text-right rounded-lg border-ink-200 bg-white focus:border-leaf-500 shadow-2xs"
                            inputMode="decimal"
                            placeholder={mode === "amount" ? `${currencySymbol}${currencySymbol.length > 1 ? " " : ""}0.00` : "%"}
                            value={mode === "amount" ? amountMap[p.id] || "" : percentMap[p.id] || ""}
                            onChange={(e) => {
                              if (mode === "amount") {
                                updateNumericField(
                                  e.target.value,
                                  (val) => setAmountMap((c) => ({ ...c, [p.id]: val })),
                                  `amount-${p.id}`,
                                  "Numbers only"
                                );
                              } else {
                                updateNumericField(
                                  e.target.value,
                                  (val) => setPercentMap((c) => ({ ...c, [p.id]: val })),
                                  `percent-${p.id}`,
                                  "Numbers only"
                                );
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-28 sm:w-32 h-8.5 shrink-0 flex items-center justify-center rounded-lg border border-dashed border-ink-200/80 bg-ink-100/50 text-[11px] font-medium text-ink-400 select-none">
                          Excluded
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Action Buttons - Solid Anchored White Footer */}
      <div className="shrink-0 border-t border-ink-100/90 bg-white px-5 sm:px-6 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.04)] z-20 flex gap-2">
        {isEditMode && onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-11 text-sm font-semibold rounded-xl"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        {/* Form completeness check for visual button feedback */}
        {(() => {
          const isFormIncomplete = !isEditMode && (!title.trim() || toMinor(amount) <= 0 || selectedIds.length === 0);
          return (
            <Button
              type="submit"
              className={`flex-1 h-11 text-sm font-semibold rounded-xl text-white transition-all ${
                isFormIncomplete || disabled || adding
                  ? "bg-ink-200 text-ink-400 cursor-not-allowed shadow-none hover:bg-ink-200"
                  : "bg-leaf-600 hover:bg-leaf-700 shadow-md active:scale-98"
              }`}
              disabled={disabled || adding || isFormIncomplete}
            >
              {isEditMode ? (
                <>
                  <Save className="h-4 w-4 mr-1.5" />
                  {adding ? "Saving changes…" : "Update Expense"}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  {adding ? "Adding expense…" : "Add Expense"}
                </>
              )}
            </Button>
          );
        })()}
      </div>
    </form>
  );
}
