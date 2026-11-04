import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  addExpense,
  addParticipant,
  deleteExpense,
  deleteSettlement,
  recordSettlement,
  updateExpense,
  updateParticipant
} from "@/api";
import {
  enqueueMutation,
  getPendingMutations,
  removeQueuedMutation,
  updateQueuedMutation
} from "@/lib/db";

export function useOfflineSync({ editId, token, onSynced }) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingMutations, setPendingMutations] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  // Refresh pending mutations list from Dexie
  const refreshPending = useCallback(async () => {
    if (!editId) return;
    const items = await getPendingMutations(editId);
    setPendingMutations(items);
  }, [editId]);

  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  // Synchronize queued mutations to server
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncingRef.current || !token || !editId) return;

    const items = await getPendingMutations(editId);
    if (!items.length) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    const idMap = new Map();
    let syncedCount = 0;
    let failedCount = 0;

    for (const item of items) {
      if (!navigator.onLine) {
        // Disconnected mid-sync, pause queue
        break;
      }

      await updateQueuedMutation(item.id, { status: "syncing" });

      try {
        switch (item.action) {
          case "addExpense": {
            // Remap participant IDs in payload if any were created offline
            const payload = { ...item.payload };
            if (idMap.has(payload.paidByParticipantId)) {
              payload.paidByParticipantId = idMap.get(payload.paidByParticipantId);
            }
            if (payload.split?.participants) {
              payload.split.participants = payload.split.participants.map((pid) =>
                idMap.get(pid) || pid
              );
            }
            const res = await addExpense(editId, token, payload);
            if (item.tempId && res?.id) {
              idMap.set(item.tempId, res.id);
            }
            break;
          }

          case "updateExpense": {
            const expId = idMap.get(item.payload.expenseId) || item.payload.expenseId;
            const payload = { ...item.payload };
            delete payload.expenseId;
            if (idMap.has(payload.paidByParticipantId)) {
              payload.paidByParticipantId = idMap.get(payload.paidByParticipantId);
            }
            await updateExpense(editId, expId, token, payload);
            break;
          }

          case "deleteExpense": {
            const expId = idMap.get(item.payload.expenseId) || item.payload.expenseId;
            await deleteExpense(editId, expId, token);
            break;
          }

          case "addParticipant": {
            const res = await addParticipant(editId, token, item.payload);
            if (item.tempId && res?.id) {
              idMap.set(item.tempId, res.id);
            }
            break;
          }

          case "updateParticipant": {
            const partId = idMap.get(item.payload.participantId) || item.payload.participantId;
            await updateParticipant(editId, partId, token, item.payload.data);
            break;
          }

          case "recordSettlement": {
            const payload = { ...item.payload };
            if (idMap.has(payload.fromParticipantId)) {
              payload.fromParticipantId = idMap.get(payload.fromParticipantId);
            }
            if (idMap.has(payload.toParticipantId)) {
              payload.toParticipantId = idMap.get(payload.toParticipantId);
            }
            const res = await recordSettlement(editId, token, payload);
            if (item.tempId && res?.id) {
              idMap.set(item.tempId, res.id);
            }
            break;
          }

          case "deleteSettlement": {
            const setlId = idMap.get(item.payload.settlementId) || item.payload.settlementId;
            await deleteSettlement(editId, setlId, token);
            break;
          }

          default:
            console.warn("[Sync] Unknown action:", item.action);
        }

        await removeQueuedMutation(item.id);
        syncedCount++;
      } catch (err) {
        console.error(`[Sync] Failed to process ${item.action}:`, err);
        const isNetworkErr = !navigator.onLine || err.message?.includes("fetch");
        if (isNetworkErr) {
          await updateQueuedMutation(item.id, { status: "pending" });
          break; // Stop loop and retry later
        } else {
          // Validation or server error, mark failed
          await updateQueuedMutation(item.id, { status: "failed", error: err.message });
          failedCount++;
        }
      }
    }

    await refreshPending();
    isSyncingRef.current = false;
    setIsSyncing(false);

    if (syncedCount > 0) {
      if (onSynced) await onSynced();
      toast.success(
        syncedCount === 1
          ? "1 offline change synced"
          : `${syncedCount} offline changes synced`
      );
    }

    if (failedCount > 0) {
      toast.error(`${failedCount} mutation(s) could not be synced`);
    }
  }, [editId, isOnline, onSynced, refreshPending, token]);

  // Online / offline event listeners
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      toast.info("Connection restored. Syncing changes…", { duration: 2000 });
      syncNow();
    }

    function handleOffline() {
      setIsOnline(false);
      toast.warning("You are currently offline. Changes will save locally.", { duration: 3000 });
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncNow]);

  // Helper to enqueue a mutation
  const queueMutation = useCallback(
    async ({ action, payload, tempId }) => {
      await enqueueMutation({
        editId,
        action,
        payload,
        token,
        tempId
      });
      await refreshPending();
    },
    [editId, refreshPending, token]
  );

  return {
    isOnline,
    pendingMutations,
    pendingCount: pendingMutations.length,
    isSyncing,
    syncNow,
    queueMutation,
    refreshPending
  };
}
