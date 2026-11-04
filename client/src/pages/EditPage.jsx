import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  DollarSign,
  Download,
  ExternalLink,
  Layers,
  Link2,
  Lock,
  MoreVertical,
  Plus,
  Receipt,
  RefreshCw,
  Share2,
  Sparkles,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wallet
} from "lucide-react";
import {
  addExpense,
  addParticipant,
  createSession,
  deleteExpense,
  deleteSettlement,
  fetchEditGroupMeta,
  fetchEditSnapshot,
  recordSettlement,
  updateExpense,
  updateParticipant,
  pdfDownloadUrl
} from "@/api";
import { AddExpenseCard } from "@/components/AddExpenseCard";
import { AddParticipantDialog } from "@/components/AddParticipantDialog";
import { ExpenseList } from "@/components/ExpenseList";
import { IdentitySelectorCard } from "@/components/IdentitySelectorCard";
import { LinkNotFoundCard } from "@/components/LinkNotFoundCard";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ParticipantProfileDialog } from "@/components/ParticipantProfileCard";
import { PinGateCard } from "@/components/PinGateCard";
import { SettlementList } from "@/components/SettlementList";
import { ShareCard } from "@/components/ShareCard";
import { usePollingSnapshot } from "@/usePollingSnapshot";
import { useOfflineSync } from "@/useOfflineSync";
import { usePwaInstall } from "@/pwa";
import { saveCachedSnapshot, getCachedSnapshot } from "@/lib/db";
import { deriveBalances, simplifyDebts } from "@/utils/settlement";
import { identityKey, tokenKey } from "@/utils/storage";
import { isValidUpiId, normalizeUpiId } from "@/utils/upiValidation";
import { money } from "@/utils/format";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function EditPage() {
  const { id: editId = "" } = useParams();
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey(editId)) || "");
  const [selectedParticipantId, setSelectedParticipantId] = useState(
    () => localStorage.getItem(identityKey(editId)) || ""
  );
  const [unlocking, setUnlocking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [missingLink, setMissingLink] = useState(false);
  const [groupMeta, setGroupMeta] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [optimisticRemovedIds, setOptimisticRemovedIds] = useState([]);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );

  useEffect(() => {
    function handleResize() {
      setIsDesktop(window.innerWidth >= 768);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (token || !editId) return;
    let active = true;

    // Check cached snapshot for instant metadata if available
    getCachedSnapshot(`edit:${editId}`).then((cached) => {
      if (active && cached?.group) {
        setGroupMeta({
          name: cached.group.name,
          currency: cached.group.currency,
          participantCount: cached.participants?.length || 0,
          viewId: cached.group.viewId,
          createdAt: cached.group.createdAt
        });
      }
    });

    setMetaLoading(true);
    fetchEditGroupMeta(editId)
      .then((meta) => {
        if (active) {
          setGroupMeta(meta);
          setMissingLink(false);
        }
      })
      .catch((err) => {
        if (active) {
          if (err.message === "Group not found") {
            setMissingLink(true);
          }
        }
      })
      .finally(() => {
        if (active) setMetaLoading(false);
      });

    return () => {
      active = false;
    };
  }, [editId, token]);

  const fetcher = useCallback(() => fetchEditSnapshot(editId, token), [editId, token]);
  const { snapshot, setSnapshot, loading, error, refetch } = usePollingSnapshot({
    enabled: Boolean(token),
    fetcher,
    cacheKey: `edit:${editId}`
  });

  const { isOnline, pendingCount, isSyncing, syncNow, queueMutation } = useOfflineSync({
    editId,
    token,
    onSynced: refetch
  });
  const { canInstall, promptInstall } = usePwaInstall();

  const participants = snapshot?.participants || [];
  const expensesFromServer = snapshot?.expenses || [];
  const optimisticVisible = useMemo(
    () => pendingExpenses.filter((item) => !expensesFromServer.some((expense) => expense.id === item.id)),
    [pendingExpenses, expensesFromServer]
  );
  const visibleExpenses = [...optimisticVisible, ...expensesFromServer].filter(
    (expense) => !optimisticRemovedIds.includes(expense.id)
  );
  const orderedParticipants = participants
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }));

  const balances = useMemo(() => {
    return deriveBalances(orderedParticipants, visibleExpenses, snapshot?.settlementHistory || []);
  }, [orderedParticipants, visibleExpenses, snapshot?.settlementHistory]);

  const settlements = useMemo(() => {
    return simplifyDebts(balances);
  }, [balances]);

  const selectedParticipant = participants.find((item) => item.id === selectedParticipantId) || null;
  const userNetBalance = useMemo(() => {
    if (!selectedParticipantId) return 0;
    const b = balances.find((item) => item.participantId === selectedParticipantId);
    return b ? b.netMinor : 0;
  }, [balances, selectedParticipantId]);

  async function unlock(pin) {
    setUnlocking(true);
    try {
      const data = await createSession({ editId, pin });
      localStorage.setItem(tokenKey(editId), data.token);
      setToken(data.token);
      setMissingLink(false);
      toast.success("Unlocked edit access");
      return { ok: true };
    } catch (err) {
      if (err.message === "Group not found") {
        setMissingLink(true);
        return { ok: false, error: "Group not found" };
      }
      toast.error(err.message || "Invalid PIN");
      return { ok: false, error: err.message || "Invalid PIN" };
    } finally {
      setUnlocking(false);
    }
  }

  function selectIdentity(participantId) {
    localStorage.setItem(identityKey(editId), participantId);
    setSelectedParticipantId(participantId);
    toast.success("Identity selected");
  }

  async function onAdd(payload) {
    if (!token) return;
    setAdding(true);

    const isOfflineMode = !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

    if (isOfflineMode) {
      const tempId = `offline_exp_${Date.now()}`;
      const offlineExpense = {
        id: tempId,
        title: payload.title,
        amountMinor: payload.amountMinor,
        paidByParticipantId: payload.paidByParticipantId,
        category: payload.category || "general",
        date: payload.date || new Date().toISOString(),
        splitJson: payload.splitJson || {},
        createdAt: new Date().toISOString(),
        __isOffline: true
      };

      await queueMutation({ action: "addExpense", payload, tempId });
      setSnapshot((curr) => {
        if (!curr) return curr;
        const updated = {
          ...curr,
          expenses: [offlineExpense, ...(curr.expenses || [])]
        };
        saveCachedSnapshot(`edit:${editId}`, updated);
        return updated;
      });

      toast.success("Saved offline. Will sync when back online.");
      setAddExpenseOpen(false);
      setAdding(false);
      return;
    }

    const tempExpense = {
      id: `temp-${Date.now()}`,
      title: payload.title,
      amountMinor: payload.amountMinor,
      paidByParticipantId: payload.paidByParticipantId,
      category: payload.category || "general",
      date: payload.date || new Date().toISOString(),
      splitJson: payload.splitJson || {},
      createdAt: new Date().toISOString(),
      __pending: true
    };
    setPendingExpenses((curr) => [tempExpense, ...curr]);

    try {
      const created = await addExpense(editId, token, payload);
      setPendingExpenses((curr) => curr.filter((item) => item.id !== tempExpense.id));
      setPendingExpenses((curr) => [created, ...curr]);
      toast.success("Expense recorded");
      setAddExpenseOpen(false);
      await refetch();
      setPendingExpenses((curr) => curr.filter((item) => item.id !== created.id));
    } catch (err) {
      setPendingExpenses((curr) => curr.filter((item) => item.id !== tempExpense.id));
      const isNetworkErr = !navigator.onLine || err.message?.includes("fetch");
      if (isNetworkErr) {
        const tempId = `offline_exp_${Date.now()}`;
        const offlineExpense = {
          id: tempId,
          title: payload.title,
          amountMinor: payload.amountMinor,
          paidByParticipantId: payload.paidByParticipantId,
          category: payload.category || "general",
          date: payload.date || new Date().toISOString(),
          splitJson: payload.splitJson || {},
          createdAt: new Date().toISOString(),
          __isOffline: true
        };
        await queueMutation({ action: "addExpense", payload, tempId });
        setSnapshot((curr) => {
          if (!curr) return curr;
          const updated = {
            ...curr,
            expenses: [offlineExpense, ...(curr.expenses || [])]
          };
          saveCachedSnapshot(`edit:${editId}`, updated);
          return updated;
        });
        toast.success("Connection dropped. Saved offline to sync later.");
        setAddExpenseOpen(false);
      } else {
        toast.error(err.message || "Failed to add expense");
      }
    } finally {
      setAdding(false);
    }
  }

  async function onUpdateExpense(expenseId, payload) {
    if (!token) return;
    setAdding(true);

    const isOfflineMode = !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

    if (isOfflineMode) {
      await queueMutation({
        action: "updateExpense",
        payload: { expenseId, ...payload }
      });
      setSnapshot((curr) => {
        if (!curr) return curr;
        const updated = {
          ...curr,
          expenses: (curr.expenses || []).map((exp) =>
            exp.id === expenseId ? { ...exp, ...payload, __isOffline: true } : exp
          )
        };
        saveCachedSnapshot(`edit:${editId}`, updated);
        return updated;
      });
      toast.success("Expense updated offline.");
      setEditingExpense(null);
      setAddExpenseOpen(false);
      setAdding(false);
      return;
    }

    try {
      await updateExpense(editId, expenseId, token, payload);
      toast.success("Expense updated");
      setEditingExpense(null);
      setAddExpenseOpen(false);
      await refetch();
    } catch (err) {
      const isNetworkErr = !navigator.onLine || err.message?.includes("fetch");
      if (isNetworkErr) {
        await queueMutation({
          action: "updateExpense",
          payload: { expenseId, ...payload }
        });
        setSnapshot((curr) => {
          if (!curr) return curr;
          const updated = {
            ...curr,
            expenses: (curr.expenses || []).map((exp) =>
              exp.id === expenseId ? { ...exp, ...payload, __isOffline: true } : exp
            )
          };
          saveCachedSnapshot(`edit:${editId}`, updated);
          return updated;
        });
        toast.success("Saved offline. Will sync when back online.");
        setEditingExpense(null);
        setAddExpenseOpen(false);
      } else {
        toast.error(err.message || "Failed to update expense");
      }
    } finally {
      setAdding(false);
    }
  }

  async function onDelete(expenseId) {
    if (!token) return;

    const isOfflineMode = !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

    if (isOfflineMode) {
      await queueMutation({
        action: "deleteExpense",
        payload: { expenseId }
      });
      setSnapshot((curr) => {
        if (!curr) return curr;
        const updated = {
          ...curr,
          expenses: (curr.expenses || []).filter((exp) => exp.id !== expenseId)
        };
        saveCachedSnapshot(`edit:${editId}`, updated);
        return updated;
      });
      toast.success("Expense deleted offline.");
      return;
    }

    setOptimisticRemovedIds((curr) => [...curr, expenseId]);
    try {
      await deleteExpense(editId, expenseId, token);
      toast.success("Expense deleted");
      await refetch();
      setOptimisticRemovedIds((curr) => curr.filter((item) => item !== expenseId));
    } catch (err) {
      const isNetworkErr = !navigator.onLine || err.message?.includes("fetch");
      if (isNetworkErr) {
        await queueMutation({
          action: "deleteExpense",
          payload: { expenseId }
        });
        setSnapshot((curr) => {
          if (!curr) return curr;
          const updated = {
            ...curr,
            expenses: (curr.expenses || []).filter((exp) => exp.id !== expenseId)
          };
          saveCachedSnapshot(`edit:${editId}`, updated);
          return updated;
        });
        toast.success("Deleted offline.");
      } else {
        setOptimisticRemovedIds((curr) => curr.filter((item) => item !== expenseId));
        toast.error(err.message || "Delete failed");
      }
    }
  }

  async function onAddMember(payload) {
    if (!token) return;
    setAddingMember(true);

    const isOfflineMode = !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

    if (isOfflineMode) {
      const tempId = `offline_part_${Date.now()}`;
      const localPerson = {
        id: tempId,
        name: payload.name.trim(),
        upiId: payload.upiId || "",
        createdAt: new Date().toISOString(),
        __isOffline: true
      };

      await queueMutation({ action: "addParticipant", payload, tempId });
      setSnapshot((curr) => {
        if (!curr) return curr;
        const updated = {
          ...curr,
          participants: [...(curr.participants || []), localPerson]
        };
        saveCachedSnapshot(`edit:${editId}`, updated);
        return updated;
      });

      toast.success(`Added ${localPerson.name} offline`);
      setAddMemberOpen(false);
      setAddingMember(false);
      return localPerson;
    }

    try {
      const newPerson = await addParticipant(editId, token, payload);
      toast.success(`Added ${newPerson.name} to the group`);
      await refetch();
      return newPerson;
    } catch (err) {
      const isNetworkErr = !navigator.onLine || err.message?.includes("fetch");
      if (isNetworkErr) {
        const tempId = `offline_part_${Date.now()}`;
        const localPerson = {
          id: tempId,
          name: payload.name.trim(),
          upiId: payload.upiId || "",
          createdAt: new Date().toISOString(),
          __isOffline: true
        };
        await queueMutation({ action: "addParticipant", payload, tempId });
        setSnapshot((curr) => {
          if (!curr) return curr;
          const updated = {
            ...curr,
            participants: [...(curr.participants || []), localPerson]
          };
          saveCachedSnapshot(`edit:${editId}`, updated);
          return updated;
        });
        toast.success(`Added ${localPerson.name} offline`);
        setAddMemberOpen(false);
        return localPerson;
      } else {
        toast.error(err.message || "Failed to add member");
        throw err;
      }
    } finally {
      setAddingMember(false);
    }
  }

  async function saveProfile(upiId) {
    if (!token || !selectedParticipantId) return;

    const normalizedUpiId = normalizeUpiId(upiId);
    if (normalizedUpiId && !isValidUpiId(normalizedUpiId)) {
      toast.error("Enter a valid UPI ID (e.g. name@bank)");
      return;
    }

    setSavingProfile(true);
    const isOfflineMode = !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

    if (isOfflineMode) {
      await queueMutation({
        action: "updateParticipant",
        payload: {
          participantId: selectedParticipantId,
          data: { upiId: normalizedUpiId }
        }
      });
      setSnapshot((curr) => {
        if (!curr) return curr;
        const updated = {
          ...curr,
          participants: (curr.participants || []).map((p) =>
            p.id === selectedParticipantId ? { ...p, upiId: normalizedUpiId } : p
          )
        };
        saveCachedSnapshot(`edit:${editId}`, updated);
        return updated;
      });
      toast.success(normalizedUpiId ? "UPI ID saved offline" : "UPI ID removed offline");
      setSavingProfile(false);
      return;
    }

    try {
      await updateParticipant(editId, selectedParticipantId, token, { upiId: normalizedUpiId });
      toast.success(normalizedUpiId ? "UPI ID saved" : "UPI ID removed");
      await refetch();
    } catch (err) {
      const isNetworkErr = !navigator.onLine || err.message?.includes("fetch");
      if (isNetworkErr) {
        await queueMutation({
          action: "updateParticipant",
          payload: {
            participantId: selectedParticipantId,
            data: { upiId: normalizedUpiId }
          }
        });
        setSnapshot((curr) => {
          if (!curr) return curr;
          const updated = {
            ...curr,
            participants: (curr.participants || []).map((p) =>
              p.id === selectedParticipantId ? { ...p, upiId: normalizedUpiId } : p
            )
          };
          saveCachedSnapshot(`edit:${editId}`, updated);
          return updated;
        });
        toast.success("Profile saved offline");
      } else {
        toast.error(err.message || "Failed to save profile");
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function onRecordSettlement(payload) {
    if (!token) return;

    const isOfflineMode = !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

    if (isOfflineMode) {
      const tempId = `offline_setl_${Date.now()}`;
      const localSettlement = {
        id: tempId,
        fromParticipantId: payload.fromParticipantId,
        toParticipantId: payload.toParticipantId,
        amountMinor: payload.amountMinor,
        note: payload.note || "Settlement",
        date: payload.date || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        __isOffline: true
      };

      await queueMutation({ action: "recordSettlement", payload, tempId });
      setSnapshot((curr) => {
        if (!curr) return curr;
        const updated = {
          ...curr,
          settlementHistory: [localSettlement, ...(curr.settlementHistory || [])]
        };
        saveCachedSnapshot(`edit:${editId}`, updated);
        return updated;
      });

      toast.success("Payment recorded offline & debt cleared");
      return;
    }

    try {
      await recordSettlement(editId, token, payload);
      toast.success("Payment recorded & debt cleared");
      await refetch();
    } catch (err) {
      const isNetworkErr = !navigator.onLine || err.message?.includes("fetch");
      if (isNetworkErr) {
        const tempId = `offline_setl_${Date.now()}`;
        const localSettlement = {
          id: tempId,
          fromParticipantId: payload.fromParticipantId,
          toParticipantId: payload.toParticipantId,
          amountMinor: payload.amountMinor,
          note: payload.note || "Settlement",
          date: payload.date || new Date().toISOString(),
          createdAt: new Date().toISOString(),
          __isOffline: true
        };
        await queueMutation({ action: "recordSettlement", payload, tempId });
        setSnapshot((curr) => {
          if (!curr) return curr;
          const updated = {
            ...curr,
            settlementHistory: [localSettlement, ...(curr.settlementHistory || [])]
          };
          saveCachedSnapshot(`edit:${editId}`, updated);
          return updated;
        });
        toast.success("Payment recorded offline");
      } else {
        toast.error(err.message || "Failed to record payment");
        throw err;
      }
    }
  }

  async function onDeleteSettlement(settlementId) {
    if (!token) return;

    const isOfflineMode = !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

    if (isOfflineMode) {
      await queueMutation({
        action: "deleteSettlement",
        payload: { settlementId }
      });
      setSnapshot((curr) => {
        if (!curr) return curr;
        const updated = {
          ...curr,
          settlementHistory: (curr.settlementHistory || []).filter((s) => s.id !== settlementId)
        };
        saveCachedSnapshot(`edit:${editId}`, updated);
        return updated;
      });
      toast.success("Payment reverted offline");
      return;
    }

    try {
      await deleteSettlement(editId, settlementId, token);
      toast.success("Payment reverted");
      await refetch();
    } catch (err) {
      const isNetworkErr = !navigator.onLine || err.message?.includes("fetch");
      if (isNetworkErr) {
        await queueMutation({
          action: "deleteSettlement",
          payload: { settlementId }
        });
        setSnapshot((curr) => {
          if (!curr) return curr;
          const updated = {
            ...curr,
            settlementHistory: (curr.settlementHistory || []).filter((s) => s.id !== settlementId)
          };
          saveCachedSnapshot(`edit:${editId}`, updated);
          return updated;
        });
        toast.success("Payment reverted offline");
      } else {
        toast.error(err.message || "Failed to revert payment");
      }
    }
  }

  async function copyLink(url, label) {
    await navigator.clipboard.writeText(url);
    toast.success(label);
  }

  if (missingLink) {
    return (
      <main id="main" className="shell max-w-lg py-12">
        <LinkNotFoundCard />
      </main>
    );
  }

  if (!token) {
    return (
      <main id="main" className="shell max-w-lg py-12">
        <PinGateCard
          groupMeta={groupMeta}
          metaLoading={metaLoading && !groupMeta}
          onSubmit={unlock}
          loading={unlocking}
        />
      </main>
    );
  }

  if (loading && !snapshot) {
    return (
      <main id="main" className="shell max-w-3xl py-12 text-center text-ink-500">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-leaf-600 border-t-transparent" />
          <p className="text-sm font-medium">Loading group data…</p>
        </div>
      </main>
    );
  }

  if (error && !snapshot) {
    if (error === "Group not found") {
      return (
        <main id="main" className="shell max-w-lg py-12">
          <LinkNotFoundCard />
        </main>
      );
    }
    return (
      <main id="main" className="shell max-w-lg py-12">
        <div className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center text-danger-800">
          <p className="font-semibold">{error}</p>
          <Button
            variant="outline"
            className="mt-4 rounded-xl text-xs"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      </main>
    );
  }

  if (snapshot && (!selectedParticipantId || !participants.find((item) => item.id === selectedParticipantId))) {
    return (
      <main id="main" className="shell max-w-lg py-10">
        <IdentitySelectorCard
          groupName={snapshot.group.name}
          participants={orderedParticipants}
          selectedId={selectedParticipantId}
          onSelect={selectIdentity}
          onAddParticipant={() => setAddMemberOpen(true)}
        />
        <AddParticipantDialog
          open={addMemberOpen}
          onOpenChange={setAddMemberOpen}
          onAdd={async (payload) => {
            const created = await onAddMember(payload);
            if (created && created.id) {
              selectIdentity(created.id);
            }
          }}
          adding={addingMember}
        />
      </main>
    );
  }

  return (
    <main id="main" className="shell max-w-4xl pb-28">
      {snapshot && (
        <div className="space-y-5">
          {/* Dashboard Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="max-w-[180px] truncate text-xl sm:max-w-none sm:text-2xl font-bold tracking-tight text-ink-900">
                  {snapshot.group.name}
                </h1>
                <Badge variant="success" className="text-[11px] font-semibold">
                  {snapshot.group.currency}
                </Badge>
              </div>

              {/* User Balance Indicator */}
              <div className={`mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm sm:mt-1 sm:min-h-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-xs ${userNetBalance > 0 ? "bg-leaf-50" : userNetBalance < 0 ? "bg-danger-50" : "bg-ink-100"}`}>
                <span className="text-ink-600">{userNetBalance > 0 ? "You are owed" : userNetBalance < 0 ? "You owe" : "You are all settled up"}</span>
                <span
                  className={`font-semibold ${
                    userNetBalance > 0
                      ? "text-leaf-700"
                      : userNetBalance < 0
                      ? "text-danger-600"
                      : "text-ink-700"
                  }`}
                >
                  {userNetBalance > 0 ? "+" : ""}
                  {money(userNetBalance, snapshot.group.currency)}
                </span>
              </div>
            </div>

            {/* Quick Actions & User Pill */}
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <Badge
                  variant="outline"
                  onClick={isOnline ? syncNow : undefined}
                  className={`h-9 gap-1.5 px-2.5 text-xs font-normal border-amber-300 bg-amber-50 text-amber-800 rounded-xl ${
                    isOnline ? "cursor-pointer hover:bg-amber-100" : ""
                  }`}
                  title={isOnline ? "Click to sync now" : "Saved offline"}
                >
                  <RefreshCw className={`h-3 w-3 ${isSyncing ? "motion-safe:animate-spin" : ""}`} />
                  <span>{pendingCount}</span>
                </Badge>
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl border-ink-200 text-xs font-semibold bg-white shadow-sm hover:border-leaf-300"
                onClick={() => setAddMemberOpen(true)}
              >
                <UserPlus className="h-3.5 w-3.5 text-leaf-600" />
                <span className="hidden sm:inline">Add Member</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl border-ink-200 text-xs font-semibold bg-white shadow-sm"
                onClick={() => setProfileOpen(true)}
              >
                <UserCheck className="h-3.5 w-3.5 text-leaf-600" />
                <span className="max-w-[80px] truncate sm:max-w-none">{selectedParticipant?.name}</span>
                {selectedParticipant?.upiId && (
                  <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" />
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Group Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setAddMemberOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2 text-leaf-600" />
                    Add Group Member
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      copyLink(`${window.location.origin}/view/${snapshot.group.viewId}`, "View link copied")
                    }
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Copy View Link
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      copyLink(`${window.location.origin}/edit/${snapshot.group.editId}`, "Edit link copied")
                    }
                  >
                    <Link2 className="h-4 w-4 mr-2 text-leaf-600" />
                    Copy Edit Link
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href={pdfDownloadUrl(snapshot.group.viewId)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </a>
                  </DropdownMenuItem>
                  {canInstall && (
                    <DropdownMenuItem onClick={promptInstall}>
                      <Download className="h-4 w-4 mr-2 text-ink-600" />
                      Install Splix App
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                    <User className="h-4 w-4 mr-2" />
                    Edit UPI / Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      localStorage.removeItem(identityKey(editId));
                      setSelectedParticipantId("");
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Switch Identity
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Offline & Sync Status Banner */}
          <OfflineBanner
            isOnline={isOnline}
            pendingCount={pendingCount}
            isSyncing={isSyncing}
            onSync={syncNow}
          />

          {/* Tabbed Navigation Layout */}
          <Tabs defaultValue="expenses" className="w-full">
            <TabsList className="sticky top-[57px] z-30 grid w-full grid-cols-3 h-12 p-1.5 rounded-2xl bg-paper/95 backdrop-blur-sm shadow-sm">
              <TabsTrigger value="expenses" className="rounded-xl text-xs sm:text-sm font-semibold">
                <Receipt className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                Expenses ({visibleExpenses.length})
              </TabsTrigger>
              <TabsTrigger value="settlements" className="rounded-xl text-xs sm:text-sm font-semibold">
                <Wallet className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                Settlements ({settlements.length})
              </TabsTrigger>
              <TabsTrigger value="summary" className="rounded-xl text-xs sm:text-sm font-semibold">
                <Share2 className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                <span className="sm:hidden">Summary</span>
                <span className="hidden sm:inline">Summary &amp; Analytics</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Expenses */}
            <TabsContent value="expenses" className="mt-4">
              <ExpenseList
                expenses={visibleExpenses}
                participants={orderedParticipants}
                currency={snapshot.group.currency}
                onEdit={(expense) => {
                  setEditingExpense(expense);
                  setAddExpenseOpen(true);
                }}
                onDelete={onDelete}
                canEdit={Boolean(selectedParticipantId)}
                canDelete={Boolean(selectedParticipantId)}
              />
            </TabsContent>

            {/* Tab 2: Settlements */}
            <TabsContent value="settlements" className="mt-4">
              <SettlementList
                settlements={settlements}
                settlementHistory={snapshot.settlementHistory || []}
                participants={orderedParticipants}
                balances={balances}
                currency={snapshot.group.currency}
                groupName={snapshot.group.name}
                onRecordSettlement={onRecordSettlement}
                onDeleteSettlement={onDeleteSettlement}
                readOnly={false}
              />
            </TabsContent>

            {/* Tab 3: Summary & Analytics */}
            <TabsContent value="summary" className="mt-4 space-y-4">
              <ShareCard
                editId={snapshot.group.editId}
                viewId={snapshot.group.viewId}
                groupName={snapshot.group.name}
                expenses={visibleExpenses}
                participants={orderedParticipants}
                settlements={settlements}
                currency={snapshot.group.currency}
              />
            </TabsContent>
          </Tabs>

          {/* Floating Action Button (FAB) for Adding Expense */}
          <div className="fixed right-6 z-30 sm:bottom-8 sm:right-8" style={{ bottom: "max(1.5rem, calc(1rem + env(safe-area-inset-bottom)))" }}>
            <Button
              size="lg"
              className="h-14 rounded-2xl bg-leaf-600 hover:bg-leaf-700 text-white shadow-2xl hover:shadow-leaf-500/30 px-5 gap-2 text-sm font-bold active:scale-95 transition-colors duration-150"
              onClick={() => {
                setEditingExpense(null);
                setAddExpenseOpen(true);
              }}
            >
              <Plus className="h-5 w-5" />
              <span>Add Expense</span>
            </Button>
          </div>

          {/* Add / Edit Expense Drawer / Sheet */}
          <Sheet
            open={addExpenseOpen}
            onOpenChange={(open) => {
              setAddExpenseOpen(open);
              if (!open) setEditingExpense(null);
            }}
          >
            <SheetContent side={isDesktop ? "right" : "bottom"}>
              <SheetHeader>
                <SheetTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</SheetTitle>
                <SheetDescription>
                  {editingExpense
                    ? "Update expense title, amount, payer, category, date, or split shares."
                    : "Enter the bill details and pick how it gets split across the group."}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 pb-6">
                <AddExpenseCard
                  participants={orderedParticipants}
                  currency={snapshot.group.currency}
                  defaultPayerId={selectedParticipantId}
                  initialExpense={editingExpense}
                  onAdd={onAdd}
                  onUpdate={onUpdateExpense}
                  onCancel={() => {
                    setAddExpenseOpen(false);
                    setEditingExpense(null);
                  }}
                  disabled={!selectedParticipantId}
                  adding={adding}
                  onSuccess={() => {
                    setAddExpenseOpen(false);
                    setEditingExpense(null);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Add Participant Dialog */}
          <AddParticipantDialog
            open={addMemberOpen}
            onOpenChange={setAddMemberOpen}
            onAdd={onAddMember}
            adding={addingMember}
          />

          {/* Participant Profile Dialog */}
          <ParticipantProfileDialog
            open={profileOpen}
            onOpenChange={setProfileOpen}
            participant={selectedParticipant}
            saving={savingProfile}
            onChangePerson={() => {
              localStorage.removeItem(identityKey(editId));
              setSelectedParticipantId("");
            }}
            onSave={saveProfile}
          />
        </div>
      )}
    </main>
  );
}
