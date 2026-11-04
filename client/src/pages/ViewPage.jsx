import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Download, Link2, MoreVertical, Receipt, Share2, Wallet, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { fetchViewSnapshot, pdfDownloadUrl } from "@/api";
import { ExpenseList } from "@/components/ExpenseList";
import { LinkNotFoundCard } from "@/components/LinkNotFoundCard";
import { SettlementList } from "@/components/SettlementList";
import { ShareCard } from "@/components/ShareCard";
import { usePollingSnapshot } from "@/usePollingSnapshot";
import { usePwaInstall } from "@/pwa";
import { money } from "@/utils/format";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function ViewPage() {
  const { id: viewId = "" } = useParams();
  const { canInstall, promptInstall } = usePwaInstall();
  const fetcher = useCallback(() => fetchViewSnapshot(viewId), [viewId]);
  const { snapshot, loading, error, refetch } = usePollingSnapshot({
    fetcher,
    enabled: Boolean(viewId),
    cacheKey: `view:${viewId}`
  });

  const totalAmountMinor = useMemo(
    () => (snapshot?.expenses || []).reduce((sum, expense) => sum + expense.amountMinor, 0),
    [snapshot?.expenses]
  );

  async function copyLink(url, label) {
    await navigator.clipboard.writeText(url);
    toast.success(label);
  }

  if (loading && !snapshot) {
    return (
      <main id="main" className="shell max-w-3xl py-12 text-center text-ink-500">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-leaf-600 border-t-transparent" />
          <p className="text-sm font-medium">Loading group details…</p>
        </div>
      </main>
    );
  }

  if (error === "Group not found") {
    return (
      <main id="main" className="shell max-w-lg py-12">
        <LinkNotFoundCard />
      </main>
    );
  }

  if (error && !snapshot) {
    return (
      <main id="main" className="shell max-w-lg py-12">
        <div className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center text-danger-800">
          <p className="font-semibold">{error}</p>
          <Button variant="outline" className="mt-4 rounded-xl text-xs" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="shell max-w-4xl pb-16">
      {snapshot && (
        <div className="space-y-5">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-900">
                  {snapshot.group.name}
                </h1>
                <Badge variant="outline" className="text-[11px] font-semibold text-ink-600">
                  View Only
                </Badge>
                <Badge variant="success" className="text-[11px] font-semibold">
                  {snapshot.group.currency}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                Total Group Spend: <strong className="text-ink-800 font-semibold">{money(totalAmountMinor, snapshot.group.currency)}</strong> across {snapshot.expenses.length} expenses
              </p>
            </div>

            {/* Quick Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-ink-200 text-xs font-semibold bg-white shadow-sm">
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share</span>
                  <MoreVertical className="h-3.5 w-3.5 ml-0.5 text-ink-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sharing</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() =>
                    copyLink(`${window.location.origin}/view/${snapshot.group.viewId}`, "View link copied")
                  }
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Copy View Link
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={pdfDownloadUrl(snapshot.group.viewId)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF Receipt
                  </a>
                </DropdownMenuItem>
                {canInstall && (
                  <DropdownMenuItem onClick={promptInstall}>
                    <Download className="h-4 w-4 mr-2 text-ink-600" />
                    Install Splix App
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tabbed Navigation */}
          <Tabs defaultValue="expenses" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-12 p-1.5 rounded-2xl bg-ink-100">
              <TabsTrigger value="expenses" className="rounded-xl text-xs sm:text-sm font-semibold">
                <Receipt className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                Expenses ({snapshot.expenses.length})
              </TabsTrigger>
              <TabsTrigger value="settlements" className="rounded-xl text-xs sm:text-sm font-semibold">
                <Wallet className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                Settlements ({snapshot.settlements?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="summary" className="rounded-xl text-xs sm:text-sm font-semibold">
                <Share2 className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                Summary &amp; Analytics
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Expenses */}
            <TabsContent value="expenses" className="mt-4">
              <ExpenseList
                expenses={snapshot.expenses || []}
                participants={snapshot.participants || []}
                currency={snapshot.group.currency}
                onDelete={() => {}}
                canDelete={false}
              />
            </TabsContent>

            {/* Tab 2: Settlements */}
            <TabsContent value="settlements" className="mt-4">
              <SettlementList
                settlements={snapshot.settlements || []}
                settlementHistory={snapshot.settlementHistory || []}
                participants={snapshot.participants || []}
                balances={snapshot.balances || []}
                currency={snapshot.group.currency}
                groupName={snapshot.group.name}
                readOnly
              />
            </TabsContent>

            {/* Tab 3: Summary & Share */}
            <TabsContent value="summary" className="mt-4 space-y-4">
              <ShareCard
                viewId={snapshot.group.viewId}
                groupName={snapshot.group.name}
                expenses={snapshot.expenses || []}
                participants={snapshot.participants || []}
                settlements={snapshot.settlements || []}
                currency={snapshot.group.currency}
                hideEditLink
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </main>
  );
}
