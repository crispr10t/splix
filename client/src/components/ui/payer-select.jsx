import * as React from "react";
import { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function PayerSelect({
  participants = [],
  value,
  onChange,
  className,
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  const selectedParticipant = useMemo(() => {
    return participants.find((p) => p.id === value) || participants[0] || null;
  }, [participants, value]);

  useEffect(() => {
    if (open) {
      setSearch("");
      if (participants.length > 6) {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  }, [open, participants.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((p) => p.name.toLowerCase().includes(q));
  }, [participants, search]);

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-xl border border-ink-300 bg-white px-3 py-2 text-sm font-medium text-ink-900 transition-colors duration-150 hover:border-ink-400 focus-visible:outline-none focus-visible:border-leaf-600 focus-visible:ring-2 focus-visible:ring-leaf-200 cursor-pointer text-left",
            className
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar
              name={selectedParticipant?.name}
              size="xs"
              className="h-6 w-6 shrink-0"
            />
            <span className="truncate">
              {selectedParticipant?.name || "Select payer"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-ink-400 shrink-0 ml-1.5" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[220px] sm:w-[240px] p-1.5 rounded-2xl shadow-xl border-ink-200 bg-white"
      >
        {participants.length > 6 && (
          <div className="relative mb-1.5 px-1 pt-0.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member..."
              className="w-full rounded-xl border border-ink-200 bg-ink-50/70 pl-8 pr-2.5 py-1 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-leaf-500 focus:bg-white transition-colors"
            />
          </div>
        )}

        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
          Paid By
        </div>

        <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-ink-400">
              No member found
            </div>
          ) : (
            filtered.map((p) => {
              const isSelected = p.id === selectedParticipant?.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors text-left",
                    isSelected
                      ? "bg-leaf-50 text-leaf-950 font-semibold"
                      : "hover:bg-ink-100/60 text-ink-800"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar
                      name={p.name}
                      size="xs"
                      className="h-6 w-6 shrink-0"
                    />
                    <span className="truncate">{p.name}</span>
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-leaf-600 shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
