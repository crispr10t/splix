import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/utils/categories";
import { hapticTap } from "@/utils/haptics";

export function ExpenseFilterContent({
  filters,
  onChange,
  participants = [],
  selectedParticipantId = ""
}) {
  const currentScope = filters.scope || (filters.payer === "involving_me" ? "involving_me" : "all");
  const currentPayer = filters.payer === "involving_me" ? "all" : (filters.payer || "all");
  const currentCategories = filters.categories || [];
  const currentDateRange = filters.dateRange || "all";
  const currentSort = filters.sort || "newest";

  function updateFilter(partial) {
    onChange({
      ...filters,
      scope: currentScope,
      payer: currentPayer,
      ...partial
    });
  }

  return (
    <div className="space-y-4 text-left">
      {/* 1. Scope: All expenses vs Involving me (if an active user is selected) */}
      {selectedParticipantId && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink-700 font-sans">
            Scope
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All expenses" },
              { id: "involving_me", label: "Involving me" }
            ].map((opt) => {
              const isSelected = currentScope === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`h-8 min-h-[36px] px-3 text-xs font-medium rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 ${
                    isSelected
                      ? "bg-leaf-600 text-white font-semibold shadow-sm"
                      : "bg-ink-100/70 text-ink-700 hover:bg-ink-100"
                  }`}
                  onClick={() => {
                    hapticTap();
                    updateFilter({ scope: opt.id });
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Paid by: Everyone / specific group members */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-ink-700 font-sans">
          Paid by
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={`h-8 min-h-[36px] px-3 text-xs font-medium rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 ${
              currentPayer === "all"
                ? "bg-leaf-600 text-white font-semibold shadow-sm"
                : "bg-ink-100/70 text-ink-700 hover:bg-ink-100"
            }`}
            onClick={() => {
              hapticTap();
              updateFilter({ payer: "all" });
            }}
          >
            Everyone
          </button>
          {participants.map((p) => {
            const isSelected = currentPayer === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`h-8 min-h-[36px] px-3 text-xs font-medium rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 ${
                  isSelected
                    ? "bg-leaf-600 text-white font-semibold shadow-sm"
                    : "bg-ink-100/70 text-ink-700 hover:bg-ink-100"
                }`}
                onClick={() => {
                  hapticTap();
                  updateFilter({ payer: p.id });
                }}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Category: Multi-select with checkmarks */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-ink-700 font-sans">
            Category
          </label>
          <span className="text-[11px] text-ink-400 font-normal">
            Multi-select
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = currentCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                className={`h-8 min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 text-xs font-medium rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 ${
                  isSelected
                    ? "bg-leaf-600 text-white font-semibold shadow-sm"
                    : "bg-ink-100/70 text-ink-700 hover:bg-ink-100"
                }`}
                onClick={() => {
                  hapticTap(8);
                  const next = isSelected
                    ? currentCategories.filter((c) => c !== cat.id)
                    : [...currentCategories, cat.id];
                  updateFilter({ categories: next });
                }}
              >
                {isSelected ? (
                  <Check className="h-3 w-3 shrink-0" />
                ) : (
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{cat.shortLabel || cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Date Range */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-ink-700 font-sans">
          Date
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All time" },
            { id: "this_week", label: "This week" },
            { id: "this_month", label: "This month" },
            { id: "custom", label: "Custom range" }
          ].map((opt) => {
            const isSelected = currentDateRange === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`h-8 min-h-[36px] px-3 text-xs font-medium rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 ${
                  isSelected
                    ? "bg-leaf-600 text-white font-semibold shadow-sm"
                    : "bg-ink-100/70 text-ink-700 hover:bg-ink-100"
                }`}
                onClick={() => {
                  hapticTap();
                  updateFilter({ dateRange: opt.id });
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {currentDateRange === "custom" && (
          <div className="grid grid-cols-2 gap-2 pt-1.5">
            <div>
              <label className="block text-[11px] font-medium text-ink-500 mb-1 font-sans">
                Start date
              </label>
              <Input
                type="date"
                className="h-8 text-xs rounded-xl border-ink-200 bg-white"
                value={filters.customStartDate || ""}
                onChange={(e) =>
                  updateFilter({ customStartDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-500 mb-1 font-sans">
                End date
              </label>
              <Input
                type="date"
                className="h-8 text-xs rounded-xl border-ink-200 bg-white"
                value={filters.customEndDate || ""}
                onChange={(e) =>
                  updateFilter({ customEndDate: e.target.value })
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. Sort */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-ink-700 font-sans">
          Sort
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: "newest", label: "Newest" },
            { id: "oldest", label: "Oldest" },
            { id: "highest", label: "Highest amount" },
            { id: "lowest", label: "Lowest amount" }
          ].map((opt) => {
            const isSelected = currentSort === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`h-8 min-h-[36px] px-2.5 text-xs font-medium rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 ${
                  isSelected
                    ? "bg-leaf-600 text-white font-semibold shadow-sm"
                    : "bg-ink-100/70 text-ink-700 hover:bg-ink-100"
                }`}
                onClick={() => {
                  hapticTap();
                  updateFilter({ sort: opt.id });
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
