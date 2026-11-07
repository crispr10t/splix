import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ExpenseFilterContent } from "@/components/ExpenseFilterContent";

export const DEFAULT_FILTERS = {
  scope: "all",
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
  participants = [],
  selectedParticipantId = ""
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
        className="flex flex-col gap-0 h-[75dvh] max-h-[75dvh] sm:max-w-lg sm:mx-auto p-0 overflow-hidden rounded-t-[1.75rem] sm:rounded-2xl border-ink-200"
      >
        <SheetHeader className="px-5 py-3 border-b border-ink-100 text-left space-y-0 shrink-0">
          <SheetTitle className="text-base font-bold text-ink-900 font-sans">
            Filters
          </SheetTitle>
          <SheetDescription className="sr-only">
            Filter by scope, payer, category, date, and sort order.
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Sheet Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-3.5">
          <ExpenseFilterContent
            filters={draft}
            onChange={setDraft}
            participants={participants}
            selectedParticipantId={selectedParticipantId}
          />
        </div>

        {/* Sticky Footer for Mobile */}
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
