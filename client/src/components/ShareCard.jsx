import { useMemo } from "react";
import {
  BarChart3,
  Crown,
  Download,
  ExternalLink,
  Link2,
  MessageCircle,
  PieChart,
  Receipt,
  Share2,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { pdfDownloadUrl } from "@/api";
import { money } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, getCategory } from "@/utils/categories";

export function ShareCard({
  editId,
  viewId,
  groupName,
  expenses = [],
  participants = [],
  settlements = [],
  currency,
  hideEditLink = false
}) {
  const byId = useMap(participants);

  function useMap(list) {
    return useMemo(() => new Map((list || []).map((p) => [p.id, p])), [list]);
  }

  const totalSpendMinor = useMemo(
    () => (expenses || []).reduce((sum, e) => sum + e.amountMinor, 0),
    [expenses]
  );

  const avgPerPersonMinor = useMemo(() => {
    if (!participants?.length) return 0;
    return Math.round(totalSpendMinor / participants.length);
  }, [totalSpendMinor, participants]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    if (!totalSpendMinor) return [];
    const catMap = new Map();
    for (const expense of expenses) {
      const catId = expense.category || "general";
      catMap.set(catId, (catMap.get(catId) || 0) + expense.amountMinor);
    }

    return Array.from(catMap.entries())
      .map(([id, amountMinor]) => {
        const cat = getCategory(id);
        const percent = Math.round((amountMinor / totalSpendMinor) * 100);
        return {
          id,
          label: cat.label,
          icon: cat.icon,
          color: cat.color,
          bgClass: cat.bgClass,
          amountMinor,
          percent
        };
      })
      .sort((a, b) => b.amountMinor - a.amountMinor);
  }, [expenses, totalSpendMinor]);

  // Top Spender
  const topSpender = useMemo(() => {
    if (!expenses.length) return null;
    const spentByPerson = new Map();
    for (const expense of expenses) {
      const pId = expense.paidByParticipantId;
      spentByPerson.set(pId, (spentByPerson.get(pId) || 0) + expense.amountMinor);
    }
    let maxId = null;
    let maxAmount = 0;
    for (const [pId, amount] of spentByPerson.entries()) {
      if (amount > maxAmount) {
        maxAmount = amount;
        maxId = pId;
      }
    }
    if (!maxId) return null;
    return {
      id: maxId,
      name: byId.get(maxId)?.name || "Unknown",
      amountMinor: maxAmount,
      percent: totalSpendMinor > 0 ? Math.round((maxAmount / totalSpendMinor) * 100) : 0
    };
  }, [expenses, byId, totalSpendMinor]);

  async function copy(text, label) {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  }

  function whatsappLink() {
    const lines = [`*${groupName || "Splix Group"}*`, ""];
    lines.push(`Total Spent: ${money(totalSpendMinor, currency)} (${expenses.length} bills)`);
    lines.push("");

    if (settlements.length) {
      lines.push("*Final Settlement Plan:*");
      settlements.forEach((item) => {
        lines.push(`• ${item.fromName} owes ${item.toName}: ${money(item.amountMinor, currency)}`);
      });
    } else {
      lines.push("*Final Settlement Plan:*");
      lines.push("All settled! No pending payments.");
    }

    lines.push("");
    lines.push(`View Link: ${window.location.origin}/view/${viewId}`);
    if (!hideEditLink && editId) {
      lines.push(`Edit Link: ${window.location.origin}/edit/${editId}`);
    }
    lines.push("");
    lines.push("Tracked via Splix (https://splix-app.vercel.app)");
    const text = lines.join("\n");
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  return (
    <div className="space-y-5">
      {/* Analytics Highlights Card */}
      {expenses.length > 0 && (
        <div className="rounded-2xl border border-ink-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold tracking-normal text-ink-500">
              <BarChart3 className="h-3.5 w-3.5 text-leaf-600" />
              <span>Spending Overview</span>
            </div>
            <Badge variant="outline" className="text-xs font-semibold text-ink-800">
              {participants.length} Participants
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {/* Total Spending */}
            <div className="rounded-xl border border-ink-200/80 bg-ink-50/70 p-3">
              <span className="text-xs font-medium text-ink-500">Total spend</span>
              <p className="mt-1 text-base sm:text-lg font-bold text-ink-900">
                {money(totalSpendMinor, currency)}
              </p>
            </div>

            {/* Average Per Person */}
            <div className="rounded-xl border border-ink-200/80 bg-ink-50/70 p-3">
              <span className="text-xs font-medium text-ink-500">Average per person</span>
              <p className="mt-1 text-base sm:text-lg font-bold text-ink-900">
                {money(avgPerPersonMinor, currency)}
              </p>
            </div>

            {/* Top Spender */}
            {topSpender && (
              <div className="col-span-2 sm:col-span-1 rounded-xl border border-leaf-200 bg-leaf-50/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-leaf-800 flex items-center gap-1">
                    <Crown className="h-3 w-3 text-amber-500" />
                    Top Spender
                  </span>
                  <span className="text-[10px] text-leaf-700 font-bold">{topSpender.percent}%</span>
                </div>
                <p className="mt-1 text-sm sm:text-base font-bold text-leaf-950 truncate">
                  {topSpender.name} ({money(topSpender.amountMinor, currency)})
                </p>
              </div>
            )}
          </div>

          {/* Category Breakdown Progress Bars */}
          {categoryBreakdown.length > 0 && (
            <div className="pt-2 border-t border-ink-100 space-y-2.5">
              <span className="text-xs font-semibold tracking-normal text-ink-500 flex items-center gap-1">
                <PieChart className="h-3.5 w-3.5 text-leaf-600" />
                Category Breakdown
              </span>

              <div className="space-y-2">
                {categoryBreakdown.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5 font-medium text-ink-700">
                          <Icon className="h-3.5 w-3.5 text-ink-500" />
                          <span>{cat.label}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink-900">{money(cat.amountMinor, currency)}</span>
                          <span className="text-[11px] text-ink-400 w-8 text-right font-medium">{cat.percent}%</span>
                        </div>
                      </div>

                      {/* Progress Bar Track */}
                      <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-leaf-500 transition-colors duration-150 duration-500"
                          style={{ width: `${cat.percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Share Actions Header */}
      <div className="flex items-center gap-1.5 text-xs font-semibold tracking-normal text-ink-500 pt-1">
        <Share2 className="h-3.5 w-3.5 text-leaf-600" />
        <span>Share &amp; Export</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* WhatsApp Summary */}
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-2xl border border-leaf-200 bg-leaf-50/70 p-4 transition-colors duration-150 hover:bg-leaf-100/70 hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf-600 text-white shadow-sm">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-leaf-950">WhatsApp Summary</p>
              <p className="text-xs text-leaf-700/90">Share calculated debts to WhatsApp</p>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-leaf-700" />
        </a>

        {/* Download PDF */}
        <a
          href={pdfDownloadUrl(viewId)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-2xl border border-ink-200 bg-white p-4 transition-colors duration-150 hover:bg-ink-50 hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-800">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900">Receipt PDF</p>
              <p className="text-xs text-ink-500">Download formatted itemized receipt</p>
            </div>
          </div>
          <Download className="h-4 w-4 text-ink-400" />
        </a>
      </div>

      {/* Copy Link Cards */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border border-ink-200 bg-white px-3.5 py-3">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-medium text-ink-500">View Link (Read-Only)</p>
            <p className="truncate text-xs font-mono text-ink-800 mt-0.5">
              {window.location.origin}/view/{viewId}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 shrink-0 text-xs rounded-xl"
            onClick={() => copy(`${window.location.origin}/view/${viewId}`, "View link copied")}
          >
            <Link2 className="h-3.5 w-3.5 mr-1" />
            Copy
          </Button>
        </div>

        {!hideEditLink && editId && (
          <div className="flex items-center justify-between rounded-xl border border-leaf-200 bg-leaf-50/50 px-3.5 py-3">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-medium text-leaf-800">Edit Link (Keep PIN Safe)</p>
              <p className="truncate text-xs font-mono text-leaf-950 mt-0.5">
                {window.location.origin}/edit/{editId}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0 text-xs rounded-xl border-leaf-300 bg-white text-leaf-800 hover:bg-leaf-50"
              onClick={() => copy(`${window.location.origin}/edit/${editId}`, "Edit link copied")}
            >
              <Link2 className="h-3.5 w-3.5 mr-1" />
              Copy
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
