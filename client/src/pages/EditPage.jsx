import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronDown,
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
  RotateCcw,
  Share2,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Wallet,
  X
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
import { DEFAULT_FILTERS } from "@/components/ExpenseFilterSheet";
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
import { hapticTap } from "@/utils/haptics";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  const shouldReduceMotion = useReducedMotion();
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
  const [expenseFilters, setExpenseFilters] = useState(DEFAULT_FILTERS);
  const [missingLink, setMissingLink] = useState(false);
  const [groupMeta, setGroupMeta] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [optimisticRemovedIds, setOptimisticRemovedIds] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const pendingDeleteRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );
  const { scrollY } = useScroll();
  const [fabCollapsed, setFabCollapsed] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState("expenses");
  useMotionValueEvent(scrollY, "change", (current) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (current < 40) setFabCollapsed(false);
    else if (current > previous + 3) setFabCollapsed(true);
    else if (current < previous - 3) setFabCollapsed(false);
  });

  useEffect(() => {
    function handleResize() {
      setIsDesktop(window.innerWidth >= 768);
      if (window.scrollY < 40) setFabCollapsed(false);
    }
    function handleScroll() {
      if (window.scrollY < 40) setFabCollapsed(false);
    }
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
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

  const fetcher = useCallback((opts) => fetchEditSnapshot(editId, token, opts), [editId, token]);
  const { snapshot, setSnapshot, loading, error, refetch } = usePollingSnapshot({
    enabled: Boolean(token) && !addExpenseOpen && !profileOpen && !addMemberOpen && !editingExpense,
    intervalMs: 25000,
    fetcher,
    cacheKey: `edit:${editId}`
  });

  const { isOnline, pendingCount, isSyncing, syncNow, queueMutation } = useOfflineSync({
    editId,
    token,
    onSynced: () => refetch({ force: true })
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

  const handleAddExpenseOpenChange = useCallback((open) => {
    setAddExpenseOpen(open);
    if (!open) setEditingExpense(null);
  }, []);

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

    const commitPendingDelete = useCallback(async () => {
    const current = pendingDeleteRef.current;
    if (!current) return;
    clearTimeout(current.timer);
    pendingDeleteRef.current = null;
    setPendingDelete(null);

    const { expenseId } = current;
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
      return;
    }

    try {
      await deleteExpense(editId, expenseId, token);
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
      } else {
        setOptimisticRemovedIds((curr) => curr.filter((item) => item !== expenseId));
        toast.error(err.message || "Failed to delete expense");
      }
    }
  }, [editId, isOnline, queueMutation, refetch, setSnapshot, token]);

  const undoPendingDelete = useCallback(() => {
    const current = pendingDeleteRef.current;
    if (!current) return;
    clearTimeout(current.timer);
    hapticTap(15);
    setOptimisticRemovedIds((curr) => curr.filter((item) => item !== current.expenseId));
    pendingDeleteRef.current = null;
    setPendingDelete(null);
  }, []);

  const onDelete = useCallback((expenseId, expense) => {
    if (!token) return;

    // If another deletion is already waiting, commit it first immediately
    if (pendingDeleteRef.current) {
      commitPendingDelete();
    }

    hapticTap(20);
    // 0ms instant optimistic row removal and balance update
    setOptimisticRemovedIds((curr) => [...curr, expenseId]);

    const expObj = expense || visibleExpenses.find((e) => e.id === expenseId) || { id: expenseId, title: "Expense" };

    const timer = setTimeout(() => {
      commitPendingDelete();
    }, 4500);

    const pendingItem = { expenseId, expense: expObj, timer };
    pendingDeleteRef.current = pendingItem;
    setPendingDelete(pendingItem);
  }, [commitPendingDelete, token, visibleExpenses]);

  // Commit any pending deletion when user leaves the page or unmounts
  useEffect(() => {
    function handleBeforeUnload() {
      if (pendingDeleteRef.current) {
        commitPendingDelete();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (pendingDeleteRef.current) {
        commitPendingDelete();
      }
    };
  }, [commitPendingDelete]);

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
      <main id="main" className="shell !max-w-lg mx-auto py-12">
        <LinkNotFoundCard />
      </main>
    );
  }

  if (!token) {
    return (
      <main id="main" className="shell !max-w-lg mx-auto py-12">
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
      <main id="main" className="shell !max-w-2xl mx-auto py-12 text-center text-ink-500">
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
        <main id="main" className="shell !max-w-lg mx-auto py-12">
          <LinkNotFoundCard />
        </main>
      );
    }
    return (
      <main id="main" className="shell !max-w-lg mx-auto py-12">
        <div className="rounded-xl border border-danger-200 bg-danger-50 p-6 text-center text-danger-800">
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
      <main id="main" className="shell !max-w-lg mx-auto py-10">
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
    <main id="main" className="shell !max-w-2xl mx-auto pb-28 font-sans">
      {snapshot && (
        <div className="space-y-5">
          {/* Single crisp white card: Header & Balance */}
          <div className="rounded-xl border border-ink-200/70 bg-white p-4 shadow-none">
            {/* Top row: Trip title on left, Identity pill and ⋮ button on right */}
            <div className="flex items-center justify-between gap-3">
              <h1 className="min-w-0 truncate text-xl sm:text-2xl font-bold tracking-tight text-ink-900 capitalize font-sans">
                {snapshot.group.name}
              </h1>

              <div className="flex items-center gap-1.5 shrink-0">
                {pendingCount > 0 && (
                  isOnline ? (
                    <button
                      type="button"
                      onClick={syncNow}
                      className="h-7 inline-flex items-center gap-1 px-2 text-xs font-normal border border-ink-200 bg-ink-100/70 text-ink-700 rounded-lg hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 transition-colors font-sans"
                      title="Click to sync now"
                    >
                      <RefreshCw className={`h-3 w-3 ${isSyncing ? "motion-safe:animate-spin" : ""}`} />
                      <span className="tabular-nums">{pendingCount}</span>
                    </button>
                  ) : (
                    <span
                      className="h-7 inline-flex items-center gap-1 px-2 text-xs font-normal border border-ink-200 bg-ink-100/70 text-ink-700 rounded-lg cursor-default font-sans"
                      title="Saved offline"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span className="tabular-nums">{pendingCount}</span>
                    </span>
                  )
                )}

                {/* Identity Pill: Subtle rounded pill [P Piyush ▾] */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full !rounded-full border border-ink-200/80 bg-white px-2.5 py-1 text-xs font-medium text-ink-800 hover:bg-ink-50 hover:border-ink-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-400 font-sans"
                      title="Active user: click to switch or edit profile"
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-leaf-100 text-[10px] font-bold text-leaf-800">
                        {(selectedParticipant?.name || "M").charAt(0).toUpperCase()}
                      </span>
                      <span className="max-w-[100px] sm:max-w-[140px] truncate">
                        {selectedParticipant?.name || "Member"}
                      </span>
                      <ChevronDown className="h-3 w-3 text-ink-400 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 max-h-72 overflow-y-auto">
                    <DropdownMenuLabel className="text-xs">Active Member</DropdownMenuLabel>
                    {orderedParticipants.map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        className={p.id === selectedParticipantId ? "font-semibold text-leaf-700" : ""}
                        onClick={() => selectIdentity(p.id)}
                      >
                        <UserCheck className={`h-4 w-4 shrink-0 ${p.id === selectedParticipantId ? "text-leaf-600" : "text-transparent"}`} />
                        <span className="truncate">{p.name}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                      <User className="h-4 w-4 shrink-0 text-ink-600" />
                      Profile &amp; UPI
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* ⋮ Menu: Focused strictly on group actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-ink-600 hover:text-ink-900 hover:bg-ink-100/60 shadow-none"
                      aria-label="Group actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 max-h-72 overflow-y-auto">
                    <DropdownMenuItem onClick={() => setAddMemberOpen(true)}>
                      <UserPlus className="h-4 w-4 shrink-0 text-leaf-600" />
                      Add Member
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        copyLink(`${window.location.origin}/view/${snapshot.group.viewId}`, "View link copied")
                      }
                    >
                      <Link2 className="h-4 w-4 shrink-0 text-ink-600" />
                      Copy View Link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        copyLink(`${window.location.origin}/edit/${snapshot.group.editId}`, "Edit link copied")
                      }
                    >
                      <Link2 className="h-4 w-4 shrink-0 text-leaf-600" />
                      Copy Edit Link
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a
                        href={pdfDownloadUrl(snapshot.group.viewId)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center"
                      >
                        <Download className="h-4 w-4 shrink-0 text-ink-600" />
                        Download PDF
                      </a>
                    </DropdownMenuItem>
                    {canInstall && (
                      <DropdownMenuItem onClick={promptInstall}>
                        <Download className="h-4 w-4 shrink-0 text-ink-600" />
                        Install Splix App
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Bottom: Stacked balance (NOT split row, no hairline divider, no redundant +) */}
            <div className="mt-3">
              <p className="text-xs font-medium text-ink-500 font-sans">
                {userNetBalance > 0 ? "You are owed" : userNetBalance < 0 ? "You owe" : "All settled"}
              </p>
              <motion.p
                key={userNetBalance}
                initial={{ scale: 0.96, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight leading-tight font-sans ${
                  userNetBalance > 0
                    ? "text-leaf-600"
                    : userNetBalance < 0
                    ? "text-danger-600"
                    : "text-ink-500"
                }`}
              >
                {money(Math.abs(userNetBalance), snapshot.group.currency)}
              </motion.p>
            </div>
          </div>

          {/* Offline & Sync Status Banner */}
          <OfflineBanner
            isOnline={isOnline}
            pendingCount={pendingCount}
            isSyncing={isSyncing}
            onSync={syncNow}
          />

          {/* Segmented Tabs Layout: Inset tinted gray track + crisp white active pill */}
          <Tabs value={activeEditTab} onValueChange={(value) => { setActiveEditTab(value); hapticTap(10); }} className="w-full">
            <TabsList className="sticky top-0 z-20 bg-ink-50/95 backdrop-blur-md pt-2 pb-1 bg-ink-100/80 p-1 rounded-xl flex gap-1 w-full h-auto border-0 shadow-none">
              <TabsTrigger
                value="expenses"
                unwrapChildren
                className="relative flex-1 rounded-lg py-2 px-3 text-xs sm:text-sm font-medium transition-colors text-ink-600 hover:text-ink-900 data-[state=active]:text-ink-950 data-[state=active]:font-medium border-0 bg-transparent shadow-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ring-0"
              >
                {activeEditTab === "expenses" && <motion.span layoutId="activeEditTabPill" className="pointer-events-none absolute inset-0 -z-0 rounded-lg bg-white shadow-sm" transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 450, damping: 35 }} />}
                <span className="relative z-10 flex items-center justify-center gap-1.5"><Receipt className="hidden h-4 w-4 sm:inline" />Expenses</span>
              </TabsTrigger>
              <TabsTrigger
                value="settlements"
                unwrapChildren
                className="relative flex-1 rounded-lg py-2 px-3 text-xs sm:text-sm font-medium transition-colors text-ink-600 hover:text-ink-900 data-[state=active]:text-ink-950 data-[state=active]:font-medium border-0 bg-transparent shadow-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ring-0"
              >
                {activeEditTab === "settlements" && <motion.span layoutId="activeEditTabPill" className="pointer-events-none absolute inset-0 -z-0 rounded-lg bg-white shadow-sm" transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 450, damping: 35 }} />}
                <span className="relative z-10 flex items-center justify-center gap-1.5"><Wallet className="hidden h-4 w-4 sm:inline" />Settlements</span>
              </TabsTrigger>
              <TabsTrigger
                value="summary"
                unwrapChildren
                className="relative flex-1 rounded-lg py-2 px-3 text-xs sm:text-sm font-medium transition-colors text-ink-600 hover:text-ink-900 data-[state=active]:text-ink-950 data-[state=active]:font-medium border-0 bg-transparent shadow-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ring-0"
              >
                {activeEditTab === "summary" && <motion.span layoutId="activeEditTabPill" className="pointer-events-none absolute inset-0 -z-0 rounded-lg bg-white shadow-sm" transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 450, damping: 35 }} />}
                <span className="relative z-10 flex items-center justify-center gap-1.5"><Share2 className="hidden h-4 w-4 sm:inline" />Summary</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeEditTab} className="mt-3">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeEditTab}
                  initial={shouldReduceMotion ? false : { opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                  transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
                  className={activeEditTab === "summary" ? "mt-1 space-y-4" : activeEditTab === "settlements" ? "mt-1" : ""}
                >
                  {activeEditTab === "expenses" && (
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
                      selectedParticipantId={selectedParticipantId}
                      isUserOwed={userNetBalance > 0}
                      filters={expenseFilters}
                      onFiltersChange={setExpenseFilters}
                    />
                  )}
                  {activeEditTab === "settlements" && (
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
                  )}
                  {activeEditTab === "summary" && (
                    <ShareCard
                      editId={snapshot.group.editId}
                      viewId={snapshot.group.viewId}
                      groupName={snapshot.group.name}
                      expenses={visibleExpenses}
                      participants={orderedParticipants}
                      settlements={settlements}
                      currency={snapshot.group.currency}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </TabsContent>
          </Tabs>

          {/* Floating Action Button (FAB) for Adding Expense - portaled directly to body to bypass all ancestor clipping and transformed layer bugs */}
          {typeof document !== "undefined" && createPortal(
            <div
              className="fixed right-6 z-30 sm:bottom-8 sm:right-8 pointer-events-auto"
              style={{
                bottom: "max(1.5rem, calc(1rem + env(safe-area-inset-bottom)))",
                transform: "none"
              }}
            >
              <button
                type="button"
                aria-label="Add expense"
                className={`inline-flex items-center justify-center h-14 ${
                  fabCollapsed ? "w-14 rounded-full px-0" : "rounded-xl px-5"
                } bg-leaf-600 hover:bg-leaf-700 text-white shadow-2xl gap-2 text-sm font-bold active:scale-95 transition-all duration-200 ease-out`}
                onClick={() => {
                  hapticTap();
                  setEditingExpense(null);
                  setAddExpenseOpen(true);
                }}
              >
                <Plus className="h-5 w-5 shrink-0" />
                <span
                  className={`overflow-hidden whitespace-nowrap transition-all duration-200 ease-out ${
                    fabCollapsed ? "max-w-0 opacity-0" : "max-w-xs opacity-100"
                  }`}
                >
                  Add Expense
                </span>
              </button>
            </div>,
            document.body
          )}

          {/* Floating Bottom Undo Snackbar */}
          <AnimatePresence>
            {pendingDelete && (
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
                style={{ bottom: "max(5.75rem, calc(5.25rem + env(safe-area-inset-bottom)))" }}
                className="fixed inset-x-4 z-40 mx-auto max-w-sm sm:max-w-md overflow-hidden rounded-2xl border border-ink-800 bg-ink-950/95 text-white shadow-2xl backdrop-blur-md"
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-danger-500/20 text-danger-400">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <span className="truncate text-xs font-medium text-ink-100 font-sans">
                      <strong className="font-semibold text-white">“{pendingDelete.expense.title}”</strong> deleted
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={undoPendingDelete}
                      className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-ink-900 transition-all hover:bg-ink-100 active:scale-95 shadow-sm"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Undo</span>
                    </button>
                    <button
                      type="button"
                      onClick={commitPendingDelete}
                      className="rounded-lg p-1 text-ink-400 hover:text-white transition-colors"
                      aria-label="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Animated countdown line */}
                <div className="h-0.5 w-full bg-ink-800/80 overflow-hidden">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 4.5, ease: "linear" }}
                    className="h-full bg-leaf-400"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add / Edit Expense Drawer / Sheet */}
          <Sheet
            open={addExpenseOpen}
            onOpenChange={handleAddExpenseOpenChange}
          >
            <SheetContent
              side={isDesktop ? "right" : "bottom"}
              onOpenAutoFocus={(e) => e.preventDefault()}
              className={isDesktop ? "" : "flex flex-col h-[92dvh] max-h-[92dvh] p-0 overflow-hidden rounded-t-[1.75rem]"}
            >
              <div className="px-5 pt-1 pb-3 shrink-0 bg-white border-b border-ink-100/80 z-10">
                <SheetHeader>
                  <SheetTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</SheetTitle>
                  <SheetDescription>
                    {editingExpense
                      ? "Update expense title, amount, payer, category, date, or split shares."
                      : "Enter the bill details and pick how it gets split across the group."}
                  </SheetDescription>
                </SheetHeader>
              </div>
              <div className={isDesktop ? "mt-4 pb-6" : "flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-2"}>
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
