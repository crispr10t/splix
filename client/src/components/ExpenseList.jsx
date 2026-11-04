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
  Users,
  X
} from "lucide-react";
import { formatDateTime, money } from "@/utils/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
      const dateA = new Date(a.date || a.createdAt).getTime();
      const dateB = new Date(b.date || b.createdAt).getTime();
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

      // 3. Participant filter (paid by OR split with)
      if (selectedParticipantId !== "all") {
        const isPayer = expense.paidByParticipantId === selectedParticipantId;
        const isInSplit = Boolean(expense.splitJson && expense.splitJson[selectedParticipantId]);
        if (!isPayer && !isInSplit) {
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
    <div className="space-y-3.5">
      {/* Header Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <h3 className="text-sm font-semibold tracking-normal text-ink-500">
            Expenses ({expenses.length})
          </h3>
          <Badge variant="outline" className="text-xs font-semibold text-ink-800">
            Total: {money(totalSpentMinor, currency)}
          </Badge>
        </div>

        {/* Search input */}
        {expenses.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <Input
              className="h-8 pl-8 pr-7 text-xs rounded-xl"
              placeholder="Search by title, payer, or category…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter Toolbar: Category Chips & Participant Filter */}
      {expenses.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-ink-200/80 bg-ink-50/60 p-2.5 sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Category pills */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                className={`rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-medium transition-colors duration-150 ${
                  selectedCategory === "all"
                    ? "bg-ink-900 text-white shadow-sm font-semibold"
                    : "bg-white text-ink-600 hover:bg-ink-100 border border-ink-200/80"
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
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] sm:text-xs font-medium transition-colors duration-150 ${
                      isSelected
                        ? "bg-leaf-600 text-white shadow-sm font-semibold"
                        : "bg-white text-ink-600 hover:bg-ink-100 border border-ink-200/80"
                    }`}
                    onClick={() => setSelectedCategory(isSelected ? "all" : cat.id)}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{cat.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Filter by person dropdown */}
            {participants.length > 2 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-medium text-ink-500">Person:</span>
                <select
                  className="h-7 rounded-lg border border-ink-300 bg-white px-2 text-[11px] font-medium text-ink-800 outline-none focus:border-leaf-600"
                  value={selectedParticipantId}
                  onChange={(e) => setSelectedParticipantId(e.target.value)}
                >
                  <option value="all">Everyone</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-1 text-[11px] text-ink-500 border-t border-ink-200/60">
              <span>
                Found <strong>{filteredExpenses.length}</strong> of {expenses.length} expenses ({money(filteredSpentMinor, currency)})
              </span>
              <button
                type="button"
                className="text-leaf-700 hover:underline font-semibold"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty States */}
      {!orderedExpenses.length ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-8 text-center text-ink-500 text-sm">
          <Receipt className="mx-auto h-8 w-8 text-ink-400 mb-2" />
          <p className="font-semibold text-ink-900">No expenses recorded yet</p>
          <p className="mt-1 text-xs text-ink-500">
            Tap &ldquo;+ Add Expense&rdquo; below to record the first shared bill.
          </p>
        </div>
      ) : null}

      {orderedExpenses.length > 0 && !filteredExpenses.length && (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-6 text-center text-ink-500 text-xs">
          <p className="font-medium text-ink-700">No expenses match the current filters.</p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-leaf-700 underline"
            onClick={clearFilters}
          >
            Reset all filters
          </button>
        </div>
      )}

      {/* Expense Items */}
      <div className="space-y-2.5">
        {filteredExpenses.map((expense) => {
          const isOpen = openId === expense.id;
          const payer = byId.get(expense.paidByParticipantId);
          const payerName = payer?.name || "Unknown";
          const splitParticipants = Object.keys(expense.splitJson || {});
          const cat = getCategory(expense.category);
          const CategoryIcon = cat.icon;
          const displayDate = expense.date || expense.createdAt;

          return (
            <div
              key={expense.id}
              className="rounded-2xl border border-ink-200 bg-white p-3.5 sm:p-4 shadow-sm transition-colors duration-150 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  aria-label={`${expense.title}, ${isOpen ? "collapse" : "expand"} expense details`}
                  className="flex flex-1 items-start gap-3 text-left"
                  onClick={() => setOpenId(isOpen ? "" : expense.id)}
                >
                  {/* Category / Payer Avatar Icon */}
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border mt-0.5 ${cat.bgClass}`}>
                    <CategoryIcon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="text-sm sm:text-base font-semibold text-ink-900 truncate">
                        {expense.title}
                      </h4>
                      <Badge variant="outline" className={`text-[10px] py-0 px-1.5 font-medium border ${cat.bgClass}`}>
                        {cat.shortLabel}
                      </Badge>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-ink-400 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-ink-400 shrink-0" />
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                      <span>By <strong className="text-ink-800 font-medium">{payerName}</strong></span>
                      <span>&bull;</span>
                      <span>{formatDateTime(displayDate)}</span>
                      {expense.__pending && (
                        <Badge variant="secondary" className="whitespace-nowrap text-[10px] py-0 px-1.5 animate-pulse">
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
                </button>

                {/* Amount & Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm sm:text-base font-bold text-ink-900 pr-1">
                    {money(expense.amountMinor, currency)}
                  </span>

                  {canEdit && !expense.__pending && onEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-ink-400 hover:text-leaf-700 rounded-xl"
                      title="Edit expense"
                      onClick={() => onEdit(expense)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {canDelete && !expense.__pending && onDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-ink-400 hover:text-danger-600 rounded-xl"
                      title="Delete expense"
                      onClick={() => onDelete(expense.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Expandable Split Details */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3.5 rounded-xl border border-ink-200/90 bg-ink-50/70 p-3.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-ink-600">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-leaf-600" />
                          <span>Split Breakdown ({splitParticipants.length} people)</span>
                        </div>
                        <span className="text-[11px] text-ink-400 font-normal">
                          Category: {cat.label}
                        </span>
                      </div>

                      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {Object.entries(expense.splitJson || {})
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
                                className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 border border-ink-200/70"
                              >
                                <span className="font-medium text-ink-800">{personName}</span>
                                <span className="font-semibold text-leaf-800">
                                  {money(valueMinor, currency)}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
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
