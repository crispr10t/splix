import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { CATEGORIES, getCategory } from "@/utils/categories";

export function ExpenseList({
  expenses = [],
  participants = [],
  currency,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false
}) {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const [openId, setOpenId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedParticipantId, setSelectedParticipantId] = useState("all");

  const orderedExpenses = useMemo(() => {
    return expenses.slice().sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime() || 0;
      const dateB = new Date(b.date || b.createdAt || 0).getTime() || 0;
      return dateB - dateA;
    });
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return orderedExpenses.filter((expense) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const payerName = byId.get(expense.paidByParticipantId)?.name?.toLowerCase() || "";
        const title = expense.title.toLowerCase();
        const cat = (expense.category || "").toLowerCase();
        if (!title.includes(query) && !payerName.includes(query) && !cat.includes(query)) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategory !== "all") {
        const expenseCategory = expense.category || "general";
        if (expenseCategory !== selectedCategory) {
          return false;
        }
      }

      // 3. Payer filter (strictly paid by selected participant)
      if (selectedParticipantId !== "all") {
        if (expense.paidByParticipantId !== selectedParticipantId) {
          return false;
        }
      }

      return true;
    });
  }, [orderedExpenses, searchQuery, selectedCategory, selectedParticipantId, byId]);

  const totalSpentMinor = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amountMinor, 0);
  }, [expenses]);

  const filteredSpentMinor = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amountMinor, 0);
  }, [filteredExpenses]);

  const hasActiveFilters = searchQuery.trim() || selectedCategory !== "all" || selectedParticipantId !== "all";

  function clearFilters() {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedParticipantId("all");
  }

  return (
    <div className="space-y-3">
      {/* Search & Filter Bar */}
      {expenses.length > 0 && (
        <div className="space-y-2.5">
          {/* Clean single search bar + Payer filter button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <Input
                className="h-9 pl-9 pr-8 text-xs rounded-xl bg-white border-ink-200/90 shadow-none focus-visible:ring-leaf-400"
                placeholder="Search by title, payer, or category…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 p-0.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {participants.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`h-9 px-2.5 rounded-xl border-ink-200/90 text-xs gap-1.5 font-medium shrink-0 bg-white shadow-none ${
                      selectedParticipantId !== "all"
                        ? "border-leaf-600 text-leaf-700 bg-leaf-50/50"
                        : "text-ink-600 hover:text-ink-900 hover:bg-ink-50"
                    }`}
                    title="Filter by payer"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    <span className="max-w-[72px] sm:max-w-[120px] truncate">
                      {selectedParticipantId === "all"
                        ? "Payer"
                        : byId.get(selectedParticipantId)?.name || "Payer"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 max-h-72 overflow-y-auto">
                  <DropdownMenuLabel className="text-xs">Filter by Payer</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className={selectedParticipantId === "all" ? "font-semibold text-leaf-700" : ""}
                    onClick={() => setSelectedParticipantId("all")}
                  >
                    Everyone
                  </DropdownMenuItem>
                  {participants.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      className={selectedParticipantId === p.id ? "font-semibold text-leaf-700" : ""}
                      onClick={() => setSelectedParticipantId(p.id)}
                    >
                      {p.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Clean Horizontal Category Chips (single row, pill shape, no scrollbar) */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              className={`h-7 px-3 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 ${
                selectedCategory === "all"
                  ? "bg-leaf-600 text-white"
                  : "bg-ink-100/70 text-ink-600 hover:bg-ink-100"
              }`}
              onClick={() => setSelectedCategory("all")}
            >
              All
            </button>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`h-7 inline-flex items-center gap-1.5 px-3 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 ${
                    isSelected
                      ? "bg-leaf-600 text-white"
                      : "bg-ink-100/70 text-ink-600 hover:bg-ink-100"
                  }`}
                  onClick={() => setSelectedCategory(isSelected ? "all" : cat.id)}
                >
                  <Icon className="h-3 w-3" />
                  <span>{cat.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Integrated Total line */}
          <div className="flex items-center justify-between px-0.5 text-xs text-ink-500">
            <span>
              {hasActiveFilters ? (
                <span className="flex items-center gap-2">
                  <span>
                    Showing <strong className="text-ink-800 font-medium">{filteredExpenses.length}</strong> of {expenses.length}
                  </span>
                  <button
                    type="button"
                    className="text-leaf-700 hover:underline font-semibold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                </span>
              ) : (
                <span>{expenses.length} expense{expenses.length === 1 ? "" : "s"}</span>
              )}
            </span>
            <span className="tabular-nums font-medium text-ink-700">
              Total: {money(hasActiveFilters ? filteredSpentMinor : totalSpentMinor, currency)}
            </span>
          </div>
        </div>
      )}

      {/* Empty States */}
      {!orderedExpenses.length ? (
        <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-8 text-center text-ink-500 text-sm">
          <Receipt className="mx-auto h-8 w-8 text-ink-400 mb-2" />
          <p className="font-semibold text-ink-900">No expenses recorded yet</p>
          <p className="mt-1 text-xs text-ink-500">
            Tap &ldquo;+ Add Expense&rdquo; below to record the first shared bill.
          </p>
        </div>
      ) : null}

      {orderedExpenses.length > 0 && !filteredExpenses.length && (
        <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-6 text-center text-ink-500 text-xs">
          <p className="font-medium text-ink-700">No expenses match the current filters.</p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-leaf-700 underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400"
            onClick={clearFilters}
          >
            Reset all filters
          </button>
        </div>
      )}

      {/* Expense Items List */}
      <div className="space-y-2">
        {filteredExpenses.map((expense) => {
          const isOpen = openId === expense.id;
          const payer = byId.get(expense.paidByParticipantId);
          const payerName = payer?.name || "Unknown";
          const splitEntries = (typeof expense.splitJson === "object" && expense.splitJson !== null)
            ? Object.entries(expense.splitJson)
            : [];
          const cat = getCategory(expense.category);
          const CategoryIcon = cat.icon;
          const displayDate = expense.date || expense.createdAt;
          const compactDate = displayDate ? formatCompactDate(displayDate) : "";

          return (
            <div
              key={expense.id}
              className="overflow-hidden rounded-xl border border-ink-200/80 bg-white transition-colors duration-150"
            >
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
                  <h3 className="text-base font-semibold text-ink-900 truncate font-sans">
                    {expense.title}
                  </h3>

                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-500">
                    <span>By <strong className="text-ink-800 font-medium">{payerName}</strong></span>
                    {Boolean(compactDate) && (
                      <span className="text-ink-400">{compactDate}</span>
                    )}
                    {expense.__pending && (
                      <Badge variant="secondary" className="whitespace-nowrap text-[10px] py-0 px-1.5 motion-safe:animate-pulse">
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

                {/* Amount and Chevron */}
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <span className="tabular-nums text-base font-semibold text-ink-900">
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
                      duration: typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.2,
                      ease: "easeOut"
                    }}
                    className="overflow-hidden border-t border-ink-100 bg-ink-50/30 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4"
                  >
                    <div className="text-xs font-medium text-ink-500">
                      Split breakdown ({splitEntries.length})
                    </div>

                    <div className="mt-2 text-sm">
                      {splitEntries.length === 0 ? (
                        <div className="py-2 text-xs text-ink-400">No split details recorded</div>
                      ) : (
                        splitEntries
                          .slice()
                          .sort((a, b) => {
                            const aName = byId.get(a[0])?.name || "";
                            const bName = byId.get(b[0])?.name || "";
                            return aName.localeCompare(bName, undefined, { sensitivity: "base", numeric: true });
                          })
                          .map(([participantId, valueMinor]) => {
                            const personName = byId.get(participantId)?.name || "Unknown";
                            return (
                              <div
                                key={participantId}
                                className="flex items-center justify-between py-2 border-b border-ink-100 last:border-b-0"
                              >
                                <span className="text-ink-700">{personName}</span>
                                <span className="tabular-nums font-medium text-ink-900">
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
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-900 transition-colors py-1 px-2.5 rounded-xl hover:bg-ink-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400"
                            onClick={() => onEdit(expense)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                        )}
                        {canDelete && onDelete && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-danger-600 hover:text-danger-800 transition-colors py-1 px-2.5 rounded-xl hover:bg-danger-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-400"
                            onClick={() => onDelete(expense.id)}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
