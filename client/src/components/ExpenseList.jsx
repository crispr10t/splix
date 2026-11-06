import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  CloudOff,
  Edit2,
  Filter,
  Receipt,
  Search,
  Trash2,
  X
} from "lucide-react";
import { formatCompactDate, money } from "@/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCategory } from "@/utils/categories";
import { DEFAULT_FILTERS, ExpenseFilterSheet } from "@/components/ExpenseFilterSheet";
import { hapticTap } from "@/utils/haptics";

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + "T00:00:00");
  }
  return new Date(dateStr);
}

function matchDateRange(expenseDate, dateRange, customStartDate, customEndDate) {
  if (dateRange === "all") return true;
  if (!expenseDate) return false;

  const d = parseLocalDate(expenseDate);
  if (!d || isNaN(d.getTime())) return false;

  const now = new Date();

  if (dateRange === "this_week") {
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sundayEnd = new Date(monday);
    sundayEnd.setDate(monday.getDate() + 7);
    sundayEnd.setMilliseconds(-1);

    return d >= monday && d <= sundayEnd;
  }

  if (dateRange === "this_month") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  if (dateRange === "custom") {
    if (customStartDate) {
      const start = parseLocalDate(customStartDate);
      start.setHours(0, 0, 0, 0);
      if (d < start) return false;
    }
    if (customEndDate) {
      const end = parseLocalDate(customEndDate);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  }

  return true;
}

export function ExpenseList({
  expenses = [],
  participants = [],
  currency,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
  selectedParticipantId = "",
  filters: controlledFilters,
  onFiltersChange: controlledOnFiltersChange
}) {
  const byId = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants]);
  const [openId, setOpenId] = useState("");
  const [pendingDeleteIds, setPendingDeleteIds] = useState(() => new Set());
  const deleteTimers = useRef(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  // Controlled or uncontrolled filter state
  const [internalFilters, setInternalFilters] = useState(DEFAULT_FILTERS);
  const filters = controlledFilters ?? internalFilters;
  const onFiltersChange = controlledOnFiltersChange ?? setInternalFilters;

  function scheduleDelete(expense) {
    if (deleteTimers.current.has(expense.id)) return;
    setPendingDeleteIds((current) => new Set(current).add(expense.id));
    const timer = setTimeout(() => {
      deleteTimers.current.delete(expense.id);
      setPendingDeleteIds((current) => {
        const next = new Set(current);
        next.delete(expense.id);
        return next;
      });
      onDelete?.(expense.id, expense, { suppressSuccessToast: true });
    }, 4000);
    deleteTimers.current.set(expense.id, timer);
    toast("Expense deleted", {
      duration: 4000,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(deleteTimers.current.get(expense.id));
          deleteTimers.current.delete(expense.id);
          setPendingDeleteIds((current) => {
            const next = new Set(current);
            next.delete(expense.id);
            return next;
          });
        }
      }
    });
  }

  // Active filters count (Sort does NOT count toward badge)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.payer !== "all") count += 1;
    count += (filters.categories || []).length;
    if (filters.dateRange !== "all") count += 1;
    return count;
  }, [filters]);

  const hasSearch = Boolean(searchQuery.trim());
  const isFiltered = activeFilterCount > 0 || hasSearch;

  // Filtered and sorted expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((expense) => {
        // 1. Text search
        if (hasSearch) {
          const query = searchQuery.toLowerCase();
          const payerName = byId.get(expense.paidByParticipantId)?.name?.toLowerCase() || "";
          const title = (expense.title || "").toLowerCase();
          const cat = (expense.category || "").toLowerCase();
          if (!title.includes(query) && !payerName.includes(query) && !cat.includes(query)) {
            return false;
          }
        }

        // 2. Payer filter
        if (filters.payer === "involving_me" && selectedParticipantId) {
          if (expense.paidByParticipantId !== selectedParticipantId && Number(expense.splitJson?.[selectedParticipantId] || 0) <= 0) return false;
        } else if (filters.payer !== "all" && expense.paidByParticipantId !== filters.payer) {
          return false;
        }

        // 3. Category filter (multi-select)
        if (filters.categories && filters.categories.length > 0) {
          const expenseCategory = expense.category || "general";
          if (!filters.categories.includes(expenseCategory)) {
            return false;
          }
        }

        // 4. Date Range
        const expenseDate = expense.date || expense.createdAt;
        if (!matchDateRange(expenseDate, filters.dateRange, filters.customStartDate, filters.customEndDate)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sort === "oldest") {
          const dateA = new Date(a.date || a.createdAt || 0).getTime() || 0;
          const dateB = new Date(b.date || b.createdAt || 0).getTime() || 0;
          return dateA - dateB;
        }
        if (filters.sort === "highest") {
          return (b.amountMinor || 0) - (a.amountMinor || 0);
        }
        if (filters.sort === "lowest") {
          return (a.amountMinor || 0) - (b.amountMinor || 0);
        }
        // Default: 'newest'
        const dateA = new Date(a.date || a.createdAt || 0).getTime() || 0;
        const dateB = new Date(b.date || b.createdAt || 0).getTime() || 0;
        return dateB - dateA;
      });
  }, [expenses, hasSearch, searchQuery, byId, filters, selectedParticipantId]);

  const totalSpentMinor = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amountMinor, 0);
  }, [expenses]);

  const filteredSpentMinor = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amountMinor, 0);
  }, [filteredExpenses]);

  const displayedExpenses = useMemo(() => {
    if (filters.sort === "highest" || filters.sort === "lowest") return filteredExpenses.map((expense) => ({ expense }));
    const groups = new Map();
    filteredExpenses.forEach((expense) => {
      const date = parseLocalDate(expense.date || expense.createdAt);
      const today = new Date();
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
      const dayKey = date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : "unknown";
      const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
      const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      weekStart.setHours(0, 0, 0, 0);
      const label = !date ? "Date unknown" : dayKey === todayKey ? "Today" : dayKey === yesterdayKey ? "Yesterday" : date >= weekStart && date <= today ? "This Week" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(expense);
    });
    return [...groups].flatMap(([label, items]) => [{ label }, ...items.map((expense) => ({ expense }))]);
  }, [filteredExpenses, filters.sort]);

  function clearAllFilters() {
    setSearchQuery("");
    onFiltersChange({ ...DEFAULT_FILTERS });
  }

  return (
    <div className="space-y-3 font-sans">
      {/* Search & Filter Header */}
      {expenses.length > 0 && (
        <div className="space-y-2">
          {/* Row 1: Search bar (flex-1) + 44px Square Filter Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                className="h-11 pl-10 pr-9 text-xs sm:text-sm rounded-xl bg-white border border-ink-200/90 shadow-none focus-visible:ring-leaf-400 font-sans"
                placeholder="Search by title, payer, or category…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 p-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 transition-colors"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* 44px Square Filter Button with Badge */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`relative h-11 w-11 shrink-0 rounded-xl border border-ink-200/90 bg-white shadow-none transition-colors ${
                activeFilterCount > 0
                  ? "text-leaf-700 hover:text-leaf-800 bg-leaf-50/50 hover:bg-leaf-100/50"
                  : "text-ink-600 hover:text-ink-900 hover:bg-ink-50"
              }`}
              onClick={() => setSheetOpen(true)}
              title="Filter expenses"
              aria-label="Filter expenses"
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-leaf-600 px-1 text-[10px] font-bold text-white tabular-nums">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Row 2: Removable Active Filter Chips (only when filters are active) */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {filters.payer !== "all" && (
                <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium bg-leaf-50 text-leaf-800 border border-leaf-200/80">
                  <span>{filters.payer === "involving_me" ? "Involving me" : `Paid by ${byId.get(filters.payer)?.name || "Member"}`}</span>
                  <button
                    type="button"
                    onClick={() => onFiltersChange({ ...filters, payer: "all" })}
                    className="text-leaf-700 hover:text-leaf-950 p-0.5 -mr-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 transition-colors"
                    title="Remove payer filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.categories && filters.categories.map((catId) => {
                const cat = getCategory(catId);
                return (
                  <span
                    key={catId}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium bg-leaf-50 text-leaf-800 border border-leaf-200/80"
                  >
                    <span>{cat.shortLabel || cat.label}</span>
                    <button
                      type="button"
                      onClick={() =>
                        onFiltersChange({
                          ...filters,
                          categories: filters.categories.filter((c) => c !== catId)
                        })
                      }
                      className="text-leaf-700 hover:text-leaf-950 p-0.5 -mr-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 transition-colors"
                      title={`Remove ${cat.shortLabel || cat.label} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}

              {filters.dateRange !== "all" && (
                <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium bg-leaf-50 text-leaf-800 border border-leaf-200/80">
                  <span>
                    {filters.dateRange === "this_week"
                      ? "This week"
                      : filters.dateRange === "this_month"
                      ? "This month"
                      : "Custom range"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        dateRange: "all",
                        customStartDate: "",
                        customEndDate: ""
                      })
                    }
                    className="text-leaf-700 hover:text-leaf-950 p-0.5 -mr-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 transition-colors"
                    title="Remove date filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Row 3: Result Line */}
          <div className="flex items-center justify-between px-0.5 text-xs text-ink-500 font-sans">
            {isFiltered ? (
              <p>
                <strong className="text-ink-800 font-medium tabular-nums">
                  {filteredExpenses.length}
                </strong>{" "}
                of {expenses.length} expense{expenses.length === 1 ? "" : "s"}{" "}
                <span className="text-ink-300 select-none" aria-hidden="true">&middot;</span>{" "}
                Total:{" "}
                <strong className="text-ink-800 font-medium tabular-nums">
                  {money(filteredSpentMinor, currency)}
                </strong>
              </p>
            ) : (
              <p>
                <span className="tabular-nums">{expenses.length}</span> expense
                {expenses.length === 1 ? "" : "s"}{" "}
                <span className="text-ink-300 select-none" aria-hidden="true">&middot;</span>{" "}
                Total:{" "}
                <span className="tabular-nums font-medium text-ink-700">
                  {money(totalSpentMinor, currency)}
                </span>
              </p>
            )}
            {isFiltered && (
              <button
                type="button"
                className="text-leaf-700 hover:text-leaf-800 hover:underline font-semibold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 transition-colors"
                onClick={clearAllFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty States */}
      {!expenses.length ? (
        <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-8 text-center text-ink-500 text-sm">
          <Receipt className="mx-auto h-8 w-8 text-ink-400 mb-2" />
          <p className="font-semibold text-ink-900 font-sans">No expenses recorded yet</p>
          <p className="mt-1 text-xs text-ink-500 font-sans">
            Tap &ldquo;+ Add Expense&rdquo; below to record the first shared bill.
          </p>
        </div>
      ) : null}

      {expenses.length > 0 && !filteredExpenses.length && (
        <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-6 text-center text-ink-500 text-xs">
          <p className="font-medium text-ink-700 font-sans">No expenses match these filters</p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-leaf-700 hover:text-leaf-800 underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 transition-colors font-sans"
            onClick={clearAllFilters}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Expense Items List with pb-24 clearance */}
      <div className="space-y-2 pb-24">
        {displayedExpenses.map((entry) => {
          if (entry.label) return <div key={`date-${entry.label}`} className="sticky top-0 z-10 bg-ink-50/90 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-500 backdrop-blur-sm">{entry.label}</div>;
          const expense = entry.expense;
          const isOpen = openId === expense.id;
          const payer = byId.get(expense.paidByParticipantId);
          const payerName = payer?.name || "Unknown";
          const splitEntries =
            typeof expense.splitJson === "object" && expense.splitJson !== null
              ? Object.entries(expense.splitJson)
              : [];
          const cat = getCategory(expense.category);
          const CategoryIcon = cat.icon;
          const displayDate = expense.date || expense.createdAt;
          const compactDate = displayDate && (filters.sort === "highest" || filters.sort === "lowest")
            ? formatCompactDate(displayDate)
            : "";
          const fullDate = displayDate ? parseLocalDate(displayDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
          const evenSplit = splitEntries.length > 1 && splitEntries.every(([, value]) => Number(value) === Number(splitEntries[0][1]));

          return (
            <motion.div
              key={expense.id}
              layout
              animate={pendingDeleteIds.has(expense.id)
                ? { height: 0, opacity: 0, marginBottom: -8 }
                : { height: "auto", opacity: 1, marginBottom: 0 }}
              transition={{ duration: 0.24, ease: "easeInOut" }}
              className="relative overflow-hidden rounded-xl border border-ink-200/80 bg-white"
            >
              {canEdit && <div className="absolute inset-y-0 left-0 flex w-[90px] items-center gap-1.5 rounded-l-xl bg-ink-800 pl-3 text-white"><Edit2 className="h-4 w-4" /><span className="text-xs font-semibold">Edit</span></div>}
              {canDelete && <div className="absolute inset-y-0 right-0 flex w-[90px] items-center justify-end gap-1.5 rounded-r-xl bg-danger-600 pr-3 text-white"><Trash2 className="h-4 w-4" /><span className="text-xs font-semibold">Delete</span></div>}
              <motion.div
                drag={isOpen || pendingDeleteIds.has(expense.id) || (!canEdit && !canDelete) ? false : "x"}
                dragDirectionLock
                dragConstraints={{ left: -100, right: 100 }}
                dragElastic={0.1}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 60 || info.velocity.x > 300) {
                    if (canEdit) { hapticTap(15); onEdit?.(expense); }
                  } else if (info.offset.x < -60 || info.velocity.x < -300) {
                    if (canDelete) { hapticTap(20); scheduleDelete(expense); }
                  }
                }}
                className="relative bg-white touch-pan-y"
              >
              {pendingDeleteIds.has(expense.id) && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.92 }} className="pointer-events-none absolute inset-0 z-10 bg-danger-600" />}
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`expense-breakdown-${expense.id}`}
                className={`w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left transition-colors hover:bg-ink-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 ${
                  isOpen ? "rounded-t-xl" : "rounded-xl"
                }`}
                onClick={() => setOpenId(isOpen ? "" : expense.id)}
              >
                {/* Category Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink-200/80 bg-ink-100/60 text-ink-700">
                  <CategoryIcon className="h-4 w-4" />
                </div>

                {/* Title & Details */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-ink-900 truncate font-sans capitalize">
                    {expense.title}
                  </h3>

                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink-500">
                    <span>
                      By <strong className="text-ink-800 font-medium">{payerName}</strong>
                    </span>
                    {Boolean(compactDate) && (
                      <>
                        <span className="text-ink-300 select-none" aria-hidden="true">·</span>
                        <span className="text-ink-400">{compactDate}</span>
                      </>
                    )}
                    {expense.__pending && (
                      <Badge
                        variant="secondary"
                        className="whitespace-nowrap text-[10px] py-0 px-1.5 motion-safe:animate-pulse"
                      >
                        Pending
                      </Badge>
                    )}
                    {expense.__isOffline && (
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-1.5 font-normal text-ink-500 border-ink-200 inline-flex items-center gap-1"
                      >
                        <CloudOff className="h-2.5 w-2.5" />
                        <span>offline</span>
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Amount and Chevron (right aligned with tabular-nums) */}
                <div className="flex items-center justify-end gap-2 shrink-0 pl-2 text-right">
                  <span className="tabular-nums text-right text-base font-semibold text-ink-900">
                    {money(expense.amountMinor, currency)}
                  </span>
                  <div className="text-ink-400">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expandable Split Details */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`expense-breakdown-${expense.id}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      duration:
                        typeof window !== "undefined" &&
                        window.matchMedia("(prefers-reduced-motion: reduce)").matches
                          ? 0
                          : 0.2,
                      ease: "easeOut"
                    }}
                    className="overflow-hidden border-t border-ink-100 bg-ink-50/30 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4"
                  >
                    <div className="text-xs font-medium text-ink-500 font-sans">
                      Split breakdown ({splitEntries.length})
                    </div>
                    {fullDate && <div className="mt-1 text-xs text-ink-500">{fullDate}</div>}

                    <div className="mt-2 text-sm font-sans">
                      {splitEntries.length === 0 ? (
                        <div className="py-2 text-xs text-ink-400">No split details recorded</div>
                      ) : evenSplit ? (
                        <>
                          <div className="flex items-center justify-between rounded-lg bg-ink-100/60 px-3 py-2.5 text-xs text-ink-700"><span>Split equally across {splitEntries.length} people</span><strong>{money(splitEntries[0][1], currency)} each</strong></div>
                          <div className="mt-2 flex flex-wrap gap-1.5">{splitEntries.map(([participantId, value]) => <span key={participantId} className={`rounded-full border px-2 py-0.5 text-[11px] ${participantId === selectedParticipantId ? "border-leaf-300 bg-leaf-50 font-semibold text-leaf-800" : "border-ink-200 bg-white text-ink-700"}`}>{participantId === selectedParticipantId ? `You: ${money(value, currency)}` : byId.get(participantId)?.name || "Unknown"}</span>)}</div>
                        </>
                      ) : (
                        splitEntries
                          .slice()
                          .sort((a, b) => {
                            const aName = byId.get(a[0])?.name || "";
                            const bName = byId.get(b[0])?.name || "";
                            return aName.localeCompare(bName, undefined, {
                              sensitivity: "base",
                              numeric: true
                            });
                          })
                          .map(([participantId, valueMinor]) => {
                            const isCurrentParticipant = participantId === selectedParticipantId;
                            const personName = byId.get(participantId)?.name || "Unknown";
                            return (
                              <div
                                key={participantId}
                                className="flex items-center justify-between py-2 border-b border-ink-100 last:border-b-0"
                              >
                                <span className={isCurrentParticipant ? "font-semibold text-leaf-800" : "text-ink-700"}>{isCurrentParticipant ? "You" : personName}</span>
                                <span className={`tabular-nums font-medium ${isCurrentParticipant ? "text-leaf-800" : "text-ink-900"}`}>
                                  {money(valueMinor, currency)}
                                </span>
                              </div>
                            );
                          })
                      )}
                    </div>

                    {(canEdit || canDelete) && !expense.__pending && (
                      <div className="mt-2.5 pt-2 border-t border-ink-100 flex items-center justify-end gap-3">
                        {canEdit && onEdit && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-900 transition-colors py-1 px-2.5 rounded-xl hover:bg-ink-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 font-sans"
                            onClick={() => onEdit(expense)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                        )}
                        {canDelete && onDelete && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-danger-600 hover:text-danger-800 transition-colors py-1 px-2.5 rounded-xl hover:bg-danger-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-400 font-sans"
                            onClick={() => scheduleDelete(expense)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Filter Bottom Sheet */}
      <ExpenseFilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        filters={filters}
        onApply={onFiltersChange}
        participants={participants}
      />
    </div>
  );
}
