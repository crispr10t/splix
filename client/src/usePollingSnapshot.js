import { useCallback, useEffect, useRef, useState } from "react";
import { getCachedSnapshot, saveCachedSnapshot } from "@/lib/db";

export function usePollingSnapshot({ fetcher, intervalMs = 25000, enabled = true, cacheKey = "" }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const runningRef = useRef(false);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  // Load from Dexie cache on initial mount for instant 0ms offline rendering
  useEffect(() => {
    if (!cacheKey) return;
    let isCurrent = true;

    getCachedSnapshot(cacheKey).then((cached) => {
      if (isCurrent && cached) {
        setSnapshot((current) => {
          const next = current || cached;
          snapshotRef.current = next;
          return next;
        });
        setLoading(false);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [cacheKey]);

  const refetch = useCallback(
    async ({ force = false } = {}) => {
      if (!enabled || runningRef.current) return snapshotRef.current;
      runningRef.current = true;
      try {
        // If offline, do not attempt network fetch
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          return snapshotRef.current;
        }

        const currentVersion = snapshotRef.current?.group?.version;
        const opts = force || !currentVersion ? {} : { since: currentVersion };
        const data = await fetcher(opts);

        if (data?.notModified) {
          // Server confirmed data hasn't changed — do not trigger re-renders
          setError("");
          return snapshotRef.current;
        }

        if (data) {
          snapshotRef.current = data;
          setSnapshot(data);
          setError("");
          if (cacheKey) {
            saveCachedSnapshot(cacheKey, data);
          }
          return data;
        }
      } catch (err) {
        // Don't show hard failure if we already have data loaded from cache
        setError(err.message || "Failed to fetch");
      } finally {
        setLoading(false);
        runningRef.current = false;
      }
    },
    [cacheKey, enabled, fetcher]
  );

  useEffect(() => {
    if (!enabled) return;

    let timerId = null;

    const startTimer = () => {
      if (timerId) clearInterval(timerId);
      timerId = window.setInterval(() => {
        // Never poll in background tabs
        if (typeof document !== "undefined" && document.hidden) return;
        refetch();
      }, intervalMs);
    };

    const stopTimer = () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    // Initial fetch on mount or when re-enabled
    refetch();

    // Only start polling interval if the tab is visible
    if (typeof document === "undefined" || !document.hidden) {
      startTimer();
    }

    const onVisibility = () => {
      if (typeof document === "undefined") return;
      if (document.hidden) {
        stopTimer();
      } else {
        refetch();
        startTimer();
      }
    };

    const onFocus = () => {
      if (typeof document === "undefined" || !document.hidden) {
        refetch();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopTimer();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, intervalMs, refetch]);

  return { snapshot, setSnapshot, loading, error, refetch };
}
