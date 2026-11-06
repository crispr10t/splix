import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Layers,
  Percent,
  Plus,
  Save,
  Users,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { sortByName } from "@/utils/sort";
import { CATEGORIES, getCategory } from "@/utils/categories";

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
  onCancel
}) {
  const sortedParticipants = sortByName(participants);
  const isEditMode = Boolean(initialExpense);

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
        toast.error(`Split amounts must total ${currency} ${(amountMinor / 100).toFixed(2)}`);
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

  const perPersonShare =
    mode === "even" && selectedIds.length > 0 && toMinor(amount) > 0
      ? (toMinor(amount) / selectedIds.length / 100).toFixed(2)
      : null;

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-3">
        {/* Title input */}
        <div>
          <label className="text-xs font-semibold tracking-normal text-ink-500">
            Expense Title
          </label>
          <Input
            ref={titleInputRef}
            autoFocus={false}
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
                {currency}
              </span>
              <Input
                ref={amountInputRef}
                className="pl-14 text-sm sm:text-base font-bold"
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
            <label className="text-xs font-semibold tracking-normal text-ink-500">
              Paid By
            </label>
            <div className="relative mt-1">
              <select
                className="flex h-11 w-full appearance-none rounded-xl border border-ink-300 bg-white px-3.5 pr-10 py-2 text-sm font-medium text-ink-900 transition-colors duration-150 focus-visible:outline-none focus-visible:border-leaf-600 focus-visible:ring-2 focus-visible:ring-leaf-200 cursor-pointer"
                value={paidByParticipantId}
                onChange={(e) => setPaidByParticipantId(e.target.value)}
              >
                {sortedParticipants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            </div>
          </div>
          {/* Expense Date Picker */}
          <div>
          <label className="text-xs font-semibold tracking-normal text-ink-500">
            Date
          </label>
          <div className="relative mt-1">
            <Input
              type="date"
              className="h-11 text-sm font-medium text-ink-900 bg-white cursor-pointer"
              value={date}
              max={localDateInputValue()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          </div>
        </div>

        {/* Quick Category Chips */}
        <div>
          <label className="text-xs font-semibold text-ink-500">Category</label>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <motion.button whileTap={{ scale: 0.93 }}
                  key={cat.id}
                  type="button"
                  className={`relative h-9 w-full min-w-0 inline-flex items-center justify-center gap-1 px-1.5 text-[11px] font-medium rounded-full !rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 ${cat.id === "entertainment" ? "col-span-2" : ""} [-webkit-tap-highlight-color:transparent] ${
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
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold tracking-normal text-ink-500">
            Split Method
          </label>
          {perPersonShare && (
            <Badge variant="success" className="text-[11px]">
              {currency} {perPersonShare} / person
            </Badge>
          )}
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-1.5 sm:gap-2">
          {[
            { id: "even", label: "Equally", icon: Layers },
            { id: "amount", label: "By Amount", icon: DollarSign },
            { id: "percentage", label: "By %", icon: Percent }
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = mode === item.id;
            return (
              <motion.button whileTap={{ scale: 0.95 }}
                key={item.id}
                type="button"
                className={`relative h-9 inline-flex items-center justify-center gap-1.5 px-2 text-xs sm:text-sm font-medium rounded-full !rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 [-webkit-tap-highlight-color:transparent] ${
                  isSelected
                    ? "text-white font-semibold"
                    : "bg-ink-100/70 text-ink-700 hover:bg-ink-100"
                }`}
                onClick={() => setMode(item.id)}
              >
                {isSelected && <motion.span layoutId="add-expense-split-method" className="absolute inset-0 -z-0 rounded-full bg-leaf-600 shadow-sm" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}
                <Icon className="relative z-10 h-3.5 w-3.5" />
                <span className="relative z-10">{item.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Participants Selector Toggle */}
        <div className="mt-3.5 border-t border-ink-200/80 pt-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-700 hover:text-ink-900"
              onClick={() => setDetailsOpen((c) => !c)}
            >
              <Users className="h-3.5 w-3.5 text-leaf-600" />
              <span>Split across {selectedIds.length} of {sortedParticipants.length} people</span>
              {detailsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {detailsOpen && selectedIds.length !== sortedParticipants.length && (
              <button
                type="button"
                className="text-xs font-semibold text-leaf-700 hover:underline"
                onClick={selectAll}
              >
                Select all
              </button>
            )}
          </div>

          {detailsOpen && (
            <div className="mt-3 grid gap-2 max-h-56 overflow-y-auto pr-1">
              {sortedParticipants.map((p) => {
                const checked = selectedIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-xl border p-2 sm:p-2.5 transition-colors duration-150 ${
                      checked
                        ? "border-leaf-200 bg-white"
                        : "border-ink-200 bg-ink-50/50 opacity-60"
                    }`}
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-2.5 text-xs sm:text-sm font-medium text-ink-900">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleParticipant(p.id)}
                        className="h-4 w-4 rounded text-leaf-600 focus:ring-leaf-500"
                      />
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-leaf-100 text-leaf-800">
                          {p.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{p.name}</span>
                    </label>

                    {checked && mode !== "even" && (
                      <div className="w-28">
                        <Input
                          className="h-8 text-xs font-semibold text-right"
                          inputMode="decimal"
                          placeholder={mode === "amount" ? `${currency} 0.00` : "%"}
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 z-10 -mx-4 flex gap-2 border-t border-ink-100 bg-white px-4 pb-[env(safe-area-inset-bottom)] pt-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
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
        <Button
          type="submit"
          className="flex-1 h-11 text-sm font-semibold rounded-xl bg-leaf-600 hover:bg-leaf-700 shadow-md text-white"
          disabled={disabled || adding}
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
      </div>
      {!isEditMode && (!title.trim() || toMinor(amount) <= 0 || selectedIds.length === 0) && (
        <p className="-mt-2 text-center text-[11px] text-ink-400">Add title, amount, and split to save</p>
      )}
    </form>
  );
}
