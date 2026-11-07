import * as React from "react";
import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Check, ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const CURRENCY_OPTIONS = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", popular: true },
  { code: "USD", symbol: "$", name: "US Dollar", popular: true },
  { code: "EUR", symbol: "€", name: "Euro", popular: true },
  { code: "GBP", symbol: "£", name: "British Pound", popular: true },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", popular: true },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar", popular: true },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", popular: true },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", popular: true },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "CNY", symbol: "CN¥", name: "Chinese Yuan" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "SAR", symbol: "SR", name: "Saudi Riyal" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong" },
  { code: "ZAR", symbol: "R", name: "South African Rand" }
];

export const ALPHABETICAL_CURRENCIES = [...CURRENCY_OPTIONS].sort((a, b) =>
  a.code.localeCompare(b.code)
);

export function CurrencySelect({
  value = "INR",
  onChange,
  className,
  onFocus,
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  const selectedCurr = useMemo(() => {
    const code = (value || "INR").toUpperCase();
    return (
      CURRENCY_OPTIONS.find((c) => c.code === code) || {
        code,
        symbol: code,
        name: code
      }
    );
  }, [value]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  const filteredCurrencies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALPHABETICAL_CURRENCIES;
    return ALPHABETICAL_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [search]);

  const popularList = useMemo(() => {
    return CURRENCY_OPTIONS.filter((c) => c.popular);
  }, []);

  const handleSelect = (code) => {
    onChange(code);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={onFocus}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-xl border border-ink-300 bg-white px-3 py-2 text-sm font-medium font-sans text-ink-900 transition-colors duration-150 hover:border-ink-400 focus-visible:outline-none focus-visible:border-leaf-600 focus-visible:ring-2 focus-visible:ring-leaf-200 cursor-pointer text-left",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-leaf-50 px-1.5 text-xs font-bold text-leaf-800 border border-leaf-200/60 shrink-0">
              {selectedCurr.symbol}
            </span>
            <span className="font-semibold text-ink-900 truncate">
              {selectedCurr.code}
            </span>
            <span className="text-xs text-ink-400 truncate hidden xs:inline">
              · {selectedCurr.name}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-ink-400 shrink-0 ml-1.5" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[280px] sm:w-[300px] p-2 rounded-2xl shadow-xl border-ink-200 bg-white"
      >
        {/* Search Bar */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full rounded-xl border border-ink-200 bg-ink-50/70 pl-8 pr-7 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-leaf-500 focus:bg-white transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Scrollable List */}
        <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
          {!search && (
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
              Popular
            </div>
          )}

          {!search &&
            popularList.map((c) => {
              const isSelected = c.code === selectedCurr.code;
              return (
                <button
                  key={`pop-${c.code}`}
                  type="button"
                  onClick={() => handleSelect(c.code)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors text-left",
                    isSelected
                      ? "bg-leaf-50 text-leaf-950 font-semibold"
                      : "hover:bg-ink-100/60 text-ink-800"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-5 w-6 items-center justify-center rounded bg-ink-100 text-[11px] font-bold text-ink-800 shrink-0">
                      {c.symbol}
                    </span>
                    <span className="font-semibold">{c.code}</span>
                    <span className="text-ink-500 text-[11px] truncate">
                      {c.name}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-leaf-600 shrink-0" />
                  )}
                </button>
              );
            })}

          {!search && (
            <div className="px-2 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-400 border-t border-ink-100 mt-1.5">
              All Currencies
            </div>
          )}

          {filteredCurrencies.length === 0 ? (
            <div className="py-6 text-center text-xs text-ink-400">
              No currencies match &ldquo;{search}&rdquo;
            </div>
          ) : (
            filteredCurrencies.map((c) => {
              const isSelected = c.code === selectedCurr.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelect(c.code)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors text-left",
                    isSelected
                      ? "bg-leaf-50 text-leaf-950 font-semibold"
                      : "hover:bg-ink-100/60 text-ink-800"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-5 w-6 items-center justify-center rounded bg-ink-100 text-[11px] font-bold text-ink-800 shrink-0">
                      {c.symbol}
                    </span>
                    <span className="font-semibold">{c.code}</span>
                    <span className="text-ink-500 text-[11px] truncate">
                      {c.name}
                    </span>
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
