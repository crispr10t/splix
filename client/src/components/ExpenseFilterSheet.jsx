import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/utils/categories";
import { motion } from "framer-motion";
import { hapticTap } from "@/utils/haptics";

export const DEFAULT_FILTERS = {
  payer: "all",
  categories: [],
  dateRange: "all",
  customStartDate: "",
  customEndDate: "",
  sort: "newest"
};

export function ExpenseFilterSheet({
  open,
  onOpenChange,
  filters,
  onApply,
  participants = []
}) {
  const [draft, setDraft] = useState(() => ({ ...DEFAULT_FILTERS, ...filters }));

  // Re-sync draft copy whenever sheet opens
  useEffect(() => {
    if (open) {
      setDraft({ ...DEFAULT_FILTERS, ...filters });
    }
  }, [open, filters]);

  function handleApply() {
    onApply(draft);
    onOpenChange(false);
  }

  function handleReset() {
    setDraft({ ...DEFAULT_FILTERS });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex flex-col gap-0 max-h-[88vh] sm:max-w-lg sm:mx-auto p-0 overflow-hidden rounded-t-2xl sm:rounded-2xl border-ink-200"
      >
        <SheetHeader className="px-5 py-3 border-b border-ink-100 text-left space-y-0">
          <SheetTitle className="text-base font-bold text-ink-900 font-sans">
            Filters
          </SheetTitle>
          <SheetDescription className="sr-only">
            Filter by payer, category, date, and sort order.
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Sheet Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-5">
          {/* 1. Paid by: Everyone / each member */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-ink-700 font-sans">
              Paid by
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <motion.button whileTap={{ scale: 0.95 }}
                type="button"
                className={`relative h-9 min-h-[44px] px-3 text-xs font-medium rounded-full !rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 ${
                  draft.payer === "all"
                    ? "text-white font-semibold"
                    : "bg-ink-100/70 text-ink-700 hover:bg-ink-100"
                }`}
                onClick={() => { hapticTap(); setDraft((d) => ({ ...d, payer: "all" })); }}
              >
                {draft.payer === "all" && <motion.span layoutId="payer-pill" className="absolute inset-0 -z-0 rounded-full bg-leaf-600" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}<span className="relative z-10">Everyone</span>
              </motion.button>
              {participants.map((p) => {
                const isSelected = draft.payer === p.id;
                return (
                  <motion.button whileTap={{ scale: 0.95 }}
                    key={p.id}
                    type="button"
                    className={`relative h-9 min-h-[44px] px-3 text-xs font-medium rounded-full !rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 ${
                      isSelected
                        ? "text-white font-semibold"
                        : "bg-ink-100/70 text-ink-700 hover:bg-ink-100"
                    }`}
                    onClick={() => { hapticTap(); setDraft((d) => ({ ...d, payer: p.id })); }}
                  >
                    {isSelected && <motion.span layoutId="payer-pill" className="absolute inset-0 -z-0 rounded-full bg-leaf-600" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}<span className="relative z-10">{p.name}</span>
                  </motion.button>
                );
              })}
              <motion.button whileTap={{ scale: 0.95 }} type="button" className={`relative h-9 min-h-[44px] px-3 text-xs font-medium rounded-full shrink-0 ${draft.payer === "involving_me" ? "text-white" : "bg-ink-100/70 text-ink-700"}`} onClick={() => { hapticTap(); setDraft((d) => ({ ...d, payer: "involving_me" })); }}>
                {draft.payer === "involving_me" && <motion.span layoutId="payer-pill" className="absolute inset-0 -z-0 rounded-full bg-leaf-600" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}<span className="relative z-10">Involving me</span>
              </motion.button>
            </div>
          </div>

          {/* 2. Category: all categories as multi-select chips */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-ink-700 font-sans">
              Category
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = draft.categories.includes(cat.id);
                return (
                  <motion.button whileTap={{ scale: 0.93 }}
                    key={cat.id}
                    type="button"
                className={`relative h-9 min-h-[44px] w-full inline-flex items-center justify-center gap-1 px-1 text-[11px] font-medium rounded-full !rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 last:col-start-2 ${
                      isSelected
                        ? "text-white font-semibold"
                        : "bg-ink-100/70 text-ink-700 hover:bg-ink-100"
                    }`}
                    onClick={() => {
                      hapticTap(8);
                      setDraft((d) => {
                        const exists = d.categories.includes(cat.id);
                        const next = exists
                          ? d.categories.filter((c) => c !== cat.id)
                          : [...d.categories, cat.id];
                        return { ...d, categories: next };
                      });
                    }}
                  >
                    {isSelected && <motion.span layoutId={`category-pill-${cat.id}`} className="absolute inset-0 -z-0 rounded-full bg-leaf-600" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}
                    <Icon className="h-3.5 w-3.5" />
                    <span className="relative z-10">{cat.shortLabel || cat.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* 3. Date: All time / This week / This month / Custom range */}
          <div className="space-y-2">
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
                const isSelected = draft.dateRange === opt.id;
                return (
                  <motion.button whileTap={{ scale: 0.95 }}
                    key={opt.id}
                    type="button"
                    className={`relative h-9 min-h-[44px] px-3 text-xs font-medium rounded-full !rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 ${
                      isSelected
                        ? "bg-leaf-600 text-white font-semibold"
                        : "bg-ink-100/70 text-ink-700 hover:bg-ink-100"
                    }`}
                    onClick={() => { hapticTap(); setDraft((d) => ({ ...d, dateRange: opt.id })); }}
                  >
                    {isSelected && <motion.span layoutId="date-range-pill" className="absolute inset-0 -z-0 rounded-full bg-leaf-600" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}<span className="relative z-10">{opt.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {draft.dateRange === "custom" && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="block text-[11px] font-medium text-ink-500 mb-1 font-sans">
                    Start date
                  </label>
                  <Input
                    type="date"
                    className="h-9 text-xs rounded-xl border-ink-200 bg-white"
                    value={draft.customStartDate || ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, customStartDate: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink-500 mb-1 font-sans">
                    End date
                  </label>
                  <Input
                    type="date"
                    className="h-9 text-xs rounded-xl border-ink-200 bg-white"
                    value={draft.customEndDate || ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, customEndDate: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Sort: Newest, Oldest, Highest amount, Lowest amount */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-ink-700 font-sans">
              Sort
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "newest", label: "Newest" },
                { id: "oldest", label: "Oldest" },
                { id: "highest", label: "Highest amount" },
                { id: "lowest", label: "Lowest amount" }
              ].map((opt) => {
                const isSelected = draft.sort === opt.id;
                return (
                  <motion.button whileTap={{ scale: 0.95 }}
                    key={opt.id}
                    type="button"
                    className={`relative h-9 min-h-[44px] px-3 text-xs font-medium rounded-full !rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 ${
                      isSelected
                        ? "text-white font-semibold"
                        : "bg-ink-100/70 text-ink-700 hover:bg-ink-100"
                    }`}
                    onClick={() => { hapticTap(); setDraft((d) => ({ ...d, sort: opt.id })); }}
                  >
                    {isSelected && <motion.span layoutId="sort-pill" className="absolute inset-0 -z-0 rounded-full bg-leaf-600" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}<span className="relative z-10">{opt.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="border-t border-ink-100 bg-white px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold text-ink-600 hover:text-ink-900 px-3 py-2 rounded-xl hover:bg-ink-100/60 transition-colors font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400"
          >
            Reset
          </button>
          <Button
            type="button"
            onClick={handleApply}
            className="h-10 px-6 rounded-xl bg-leaf-600 hover:bg-leaf-700 text-white font-medium text-xs shadow-none font-sans"
          >
            Apply
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
