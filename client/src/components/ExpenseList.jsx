import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  CloudOff,
  Edit2,
  Filter,
  FilterX,
  Receipt,
  Search,
  SearchX,
  Trash2,
  X
} from "lucide-react";
import { money } from "@/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  isUserOwed = false,
  filters: controlledFilters,
  onFiltersChange: controlledOnFiltersChange
}) {
  const byId = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants]);
  const [openId, setOpenId] = useState("");
  const cardRefs = useRef(new Map());
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!openId) return;
    const timer = setTimeout(() => {
      const card = cardRefs.current.get(openId);
      if (card) {
        card.scrollIntoView({
          behavior: shouldReduceMotion ? "auto" : "smooth",
          block: "nearest"
        });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [openId, shouldReduceMotion]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );

  useEffect(() => {
    function handleResize() {
      setIsDesktop(window.innerWidth >= 768);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Controlled or uncontrolled filter state
  const [internalFilters, setInternalFilters] = useState(DEFAULT_FILTERS);
  const filters = controlledFilters ?? internalFilters;
  const onFiltersChange = controlledOnFiltersChange ?? setInternalFilters;

  function handleDelete(expense) {
    hapticTap(20);
    setOpenId("");
    onDelete?.(expense.id, expense);
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
      let label;
      if (!date) {
        label = "Date unknown";
      } else if (dayKey === todayKey) {
        label = "Today";
      } else if (dayKey === yesterdayKey) {
        label = "Yesterday";
      } else if (date.getFullYear() === today.getFullYear()) {
        label = date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
      } else {
        label = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      }
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(expense);
    });
    return [...groups].flatMap(([label, items]) => [
      { label },
      ...items.map((expense) => ({ expense, groupLabel: label }))
    ]);
  }, [filteredExpenses, filters.sort]);

  const filterDescription = useMemo(() => {
    const parts = [];
    if (searchQuery.trim()) {
      parts.push(`“${searchQuery.trim()}”`);
    }
    if (filters.payer !== "all") {
      parts.push(filters.payer === "involving_me" ? "involving you" : `paid by ${byId.get(filters.payer)?.name || "selected member"}`);
    }
    if (filters.categories?.length > 0) {
      if (filters.categories.length === 1) {
        parts.push(getCategory(filters.categories[0])?.label || "category");
      } else {
        parts.push(`${filters.categories.length} categories`);
      }
    }
    if (filters.dateRange !== "all") {
      const labels = {
        today: "today",
        yesterday: "yesterday",
        this_week: "this week",
        custom: "selected dates"
      };
      parts.push(labels[filters.dateRange] || "date range");
    }
    return parts.join(" · ");
  }, [searchQuery, filters, byId]);

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
                className="h-11 pl-10 pr-9 text-xs sm:text-sm rounded-xl bg-white border border-ink-200/90 shadow-none focus-visible:ring-leaf-400 font-sans truncate placeholder:truncate"
                placeholder={isDesktop ? "Search by title, payer, or category…" : "Search expenses…"}
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

          {/* Row 3: Result Line (only when filters or search are active) */}
          {isFiltered && (
            <div className="flex items-center justify-between px-0.5 text-xs text-ink-500 font-sans">
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
              <button
                type="button"
                className="text-leaf-700 hover:text-leaf-800 hover:underline font-semibold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 transition-colors"
                onClick={clearAllFilters}
              >
                Clear filters
              </button>
            </div>
          )}
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
        <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-6 sm:p-8 text-center text-ink-500">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-100/80 text-ink-500 mb-3">
            {searchQuery.trim() ? (
              <SearchX className="h-5 w-5" />
            ) : (
              <FilterX className="h-5 w-5" />
            )}
          </div>
          <p className="font-semibold text-ink-900 font-sans text-sm sm:text-base">
            No matching expenses
          </p>
          <p className="mt-1 text-xs text-ink-500 font-sans max-w-xs mx-auto">
            {filterDescription
              ? `No expenses found for ${filterDescription}`
              : "Try adjusting or resetting your search and active filters."}
          </p>
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-4 rounded-xl text-xs font-semibold text-ink-700 hover:text-ink-900 bg-white border-ink-200 shadow-none font-sans"
              onClick={clearAllFilters}
            >
              Reset filters
            </Button>
          </div>
        </div>
      )}

      {/* Expense Items List with pb-24 clearance */}
      <div className="space-y-2 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        <AnimatePresence initial={false}>
          {displayedExpenses.map((entry) => {
            if (entry.label) {
              return (
                <motion.div
                  key={`date-${entry.label}`}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="sticky top-0 z-10 bg-ink-50/90 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-500 backdrop-blur-sm"
                >
                  {entry.label}
                </motion.div>
              );
            }
            const expense = entry.expense;
            const isOpen = openId === expense.id;
            const payer = byId.get(expense.paidByParticipantId);
            const isCurrentUserPayer = Boolean(selectedParticipantId && expense.paidByParticipantId === selectedParticipantId);
            const payerName = isCurrentUserPayer ? "You" : payer?.name || "Unknown";
            const splitEntries =
              typeof expense.splitJson === "object" && expense.splitJson !== null
                ? Object.entries(expense.splitJson)
                : [];
            const cat = getCategory(expense.category);
            const CategoryIcon = cat.icon;
            const displayDate = expense.date || expense.createdAt;
            const parsedDisplayDate = displayDate ? parseLocalDate(displayDate) : null;
            const fullDate = parsedDisplayDate && !Number.isNaN(parsedDisplayDate.getTime())
              ? parsedDisplayDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
              : "";
            const shareMinor = selectedParticipantId
              ? Number(expense.splitJson?.[selectedParticipantId] || 0)
              : null;

            return (
              <motion.div
                key={expense.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(expense.id, el);
                  else cardRefs.current.delete(expense.id);
                }}
                layout
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  height: 0,
                  scale: 0.96,
                  marginBottom: 0,
                  transition: { duration: 0.22, ease: [0.25, 1, 0.5, 1] }
                }}
                className="relative overflow-hidden rounded-xl border border-ink-200/80 bg-white scroll-mb-24"
              >
              {!isOpen && !isDesktop && canEdit && (
                <div className="pointer-events-none absolute inset-y-0 left-0 flex w-[90px] items-center gap-1.5 rounded-l-xl bg-ink-800 pl-3 text-white">
                  <Edit2 className="h-4 w-4" />
                  <span className="text-xs font-semibold">Edit</span>
                </div>
              )}
              {!isOpen && !isDesktop && canDelete && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex w-[90px] items-center justify-end gap-1.5 rounded-r-xl bg-danger-600 pr-3 text-white">
                  <Trash2 className="h-4 w-4" />
                  <span className="text-xs font-semibold">Delete</span>
                </div>
              )}
              <motion.div
                animate={{ x: 0 }}
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                drag={!isDesktop && !isOpen && (canEdit || canDelete) ? "x" : false}
                dragSnapToOrigin
                dragDirectionLock
                dragConstraints={{ left: canDelete ? -120 : 0, right: canEdit ? 120 : 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 80 || info.velocity.x > 500) {
                    if (canEdit) { hapticTap(15); onEdit?.(expense); }
                  } else if (info.offset.x < -80 || info.velocity.x < -500) {
                    if (canDelete) { handleDelete(expense); }
                  }
                }}
                className="relative bg-white touch-pan-y"
              >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`expense-breakdown-${expense.id}`}
                className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left transition-colors hover:bg-ink-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 rounded-xl"
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

                  <div className="mt-0.5 flex min-w-0 items-center gap-x-1.5 text-xs text-ink-500">
                    <span className="truncate">
                      Paid by <strong className="font-medium text-ink-800">{payerName}</strong>
                    </span>
                    {expense.__pending && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 whitespace-nowrap px-1.5 py-0 text-[10px] motion-safe:animate-pulse"
                      >
                        Pending
                      </Badge>
                    )}
                    {expense.__isOffline && (
                      <Badge
                        variant="outline"
                        className="inline-flex shrink-0 items-center gap-1 border-ink-200 px-1.5 py-0 text-[10px] font-normal text-ink-500"
                      >
                        <CloudOff className="h-2.5 w-2.5" />
                        <span>offline</span>
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Amount and Chevron (right aligned with tabular-nums) */}
                <div className="flex items-center justify-end gap-2 shrink-0 pl-2 text-right">
                  <div className="flex min-w-0 flex-col items-end">
                    <span className="whitespace-nowrap tabular-nums text-right text-base font-semibold text-ink-900">
                      {money(expense.amountMinor, currency)}
                    </span>
                    {selectedParticipantId && (
                      <span className={`whitespace-nowrap text-[10.5px] tabular-nums ${shareMinor > 0 ? "text-ink-400 font-normal" : "text-ink-300"}`}>
                        {shareMinor > 0 ? `Your share: ${money(shareMinor, currency)}` : "Not involved"}
                      </span>
                    )}
                  </div>
                  <div className="text-ink-400">
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ease-out ${isOpen ? "rotate-180 text-leaf-800" : "rotate-0 text-ink-400"}`} />
                  </div>
                </div>
              </button>

              {/* Expandable Split Details */}
              <div
                id={`expense-breakdown-${expense.id}`}
                data-state={isOpen ? "open" : "closed"}
                className="accordion-grid"
              >
                <div className="overflow-hidden">
                  <div className="border-t border-ink-100 bg-ink-50/30 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
                    {fullDate && <div className="text-xs font-medium font-sans text-ink-600">{fullDate}</div>}
                    <div className="mt-1 text-xs font-medium text-ink-500 font-sans">Split details</div>

                    <div className="mt-2 text-sm font-sans">
                      {splitEntries.length === 0 ? (
                        <div className="py-2 text-xs text-ink-400">No split details recorded</div>
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
                                className={`flex items-center justify-between gap-3 rounded-lg px-2 py-2 ${isCurrentParticipant ? "bg-leaf-50/80" : ""}`}
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <Avatar className="h-[22px] w-[22px] ring-0">
                                    <AvatarFallback className={`text-[9px] ${isCurrentParticipant ? "bg-leaf-100 text-leaf-800" : "bg-ink-100 text-ink-600"}`}>
                                      {personName.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className={`truncate ${isCurrentParticipant ? "font-semibold text-leaf-800" : "text-ink-700"}`}>{isCurrentParticipant ? "You" : personName}</span>
                                </div>
                                <span className={`shrink-0 tabular-nums font-medium ${isCurrentParticipant ? "text-leaf-800" : "text-ink-900"}`}>
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
                            onClick={() => handleDelete(expense)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              </motion.div>
            </motion.div>
          );
        })}

        </AnimatePresence>
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
