import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OfflineBanner({ isOnline, pendingCount = 0, isSyncing = false, onSync }) {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50/90 dark:border-ink-800 dark:bg-ink-900/60 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs text-ink-700 dark:text-ink-300">
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="h-4 w-4 text-ink-500 flex-shrink-0" />
            <span>You are offline. Changes are saved locally and will sync when reconnected.</span>
          </>
        ) : (
          <>
            <RefreshCw
              className={`h-4 w-4 text-amber-600 flex-shrink-0 ${isSyncing ? "animate-spin" : ""}`}
            />
            <span>
              {pendingCount} offline change{pendingCount > 1 ? "s" : ""} waiting to sync.
            </span>
          </>
        )}
      </div>
      {isOnline && pendingCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          disabled={isSyncing}
          onClick={onSync}
          className="h-7 px-2.5 text-xs font-medium border-ink-300 dark:border-ink-700 flex-shrink-0"
        >
          {isSyncing ? "Syncing…" : "Sync now"}
        </Button>
      )}
    </div>
  );
}
