import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, WifiOff } from "lucide-react";
import { SplixLogo } from "./Logo";
import { usePwaInstall } from "@/pwa";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AppHeader({ groupName, rightContent }) {
  const { canInstall, promptInstall } = usePwaInstall();
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white">
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="container flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Go to home" className="inline-flex items-center transition hover:opacity-90">
            <SplixLogo className="h-8 w-auto" />
          </Link>
          {groupName && (
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-ink-200">
              <span className="text-sm font-semibold text-ink-900 truncate max-w-xs">{groupName}</span>
            </div>
          )}
          {!isOnline && (
            <Badge
              variant="secondary"
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-normal text-ink-600 border border-ink-200 py-0.5 px-2"
            >
              <WifiOff className="h-3 w-3" />
              <span>Offline</span>
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isOnline && (
            <Badge
              variant="secondary"
              className="sm:hidden inline-flex items-center gap-1 text-[11px] font-normal text-ink-600 border border-ink-200 py-0.5 px-2"
            >
              <WifiOff className="h-3 w-3" />
              <span>Offline</span>
            </Badge>
          )}

          {canInstall && (
            <Button
              variant="outline"
              size="sm"
              onClick={promptInstall}
              className="h-8 px-2.5 text-xs font-medium border-ink-200 hover:bg-ink-100 text-ink-700 rounded-lg gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Install App</span>
            </Button>
          )}

          {rightContent}
        </div>
      </div>
    </header>
  );
}
