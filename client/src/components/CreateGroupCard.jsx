import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { createGroup, warmApi } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const standardCurrencies = [
  "AED", "AUD", "BRL", "CAD", "CHF", "CNY", "EUR", "GBP",
  "HKD", "INR", "JPY", "KRW", "MXN", "NOK", "NZD", "SAR",
  "SEK", "SGD", "TRY", "USD", "ZAR"
];

export function CreateGroupCard({ isDialog = false, onClose }) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [pin, setPin] = useState("");
  const [participants, setParticipants] = useState(["Person 1", "Person 2"]);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    const runWarmup = () => {
      void warmApi();
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(runWarmup, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }

    const timeoutId = window.setTimeout(runWarmup, 600);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const canSubmit = useMemo(
    () => name.trim() && /^\d{4}$/.test(pin) && participants.filter((p) => p.trim()).length >= 2,
    [name, pin, participants]
  );

  async function onSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const cleanParticipants = participants
        .map((participant) => participant.trim())
        .filter((participant) => participant.length > 0)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }))
        .map((name) => ({ name }));

      const data = await createGroup({
        name: name.trim(),
        currency: currency.trim().toUpperCase(),
        pin,
        participants: cleanParticipants
      });
      setResult(data);
      toast.success("Group created successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to create group");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink(path, key) {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    if (key) {
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 2000);
    }
    toast.success("Link copied to clipboard");
  }

  const innerContent = (
    <div className={isDialog ? "space-y-4 max-h-[80vh] overflow-y-auto pr-1" : "space-y-4"}>
      {/* Header if inside dialog */}
      {isDialog && (
        <div className={`flex items-center gap-3 pb-3 border-b pr-6 ${result ? "border-leaf-200/70" : "border-ink-100"}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-leaf-50 text-leaf-800 shrink-0">
            {result ? <CheckCircle2 className="h-5 w-5 text-leaf-700" /> : <Users className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-ink-900 leading-tight">
              {result ? "Links generated" : "Create a Group"}
            </h2>
            <p className={`text-xs mt-0.5 ${result ? "text-leaf-800 font-medium" : "text-ink-500"}`}>
              {result ? "Use Edit to manage expenses. Share View for read-only access." : "Start splitting bills instantly. No account required."}
            </p>
          </div>
        </div>
      )}

      {!result ? (
        <form className="space-y-4" onSubmit={onSubmit}>
          {/* Group Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-700">Group Name</label>
            <div className="relative">
              <Input
                autoFocus={isDialog}
                className="pl-9 h-11 text-sm rounded-xl"
                maxLength={50}
                placeholder="e.g. Goa Trip, Flat 402, Friday Dinner"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => void warmApi()}
              />
              <Users className="absolute left-3 top-3.5 h-4 w-4 text-ink-400" />
            </div>
          </div>

          {/* Currency & PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-700 block">Currency</label>
              <div className="relative">
                <select
                  className="flex h-11 w-full rounded-xl border border-ink-300 bg-white px-3.5 py-2 text-sm font-medium text-ink-900 focus-visible:outline-none focus-visible:border-leaf-600 focus-visible:ring-2 focus-visible:ring-leaf-200 transition-colors duration-150 cursor-pointer"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  onFocus={() => void warmApi()}
                >
                  {standardCurrencies.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-700 block">PIN</label>
              <div className="relative">
                <Input
                  className="pl-9 font-mono tracking-normal text-sm rounded-xl h-11"
                  placeholder="••••"
                  maxLength={4}
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  onFocus={() => void warmApi()}
                />
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-ink-400" />
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink-700">Group Members</label>
              <Badge variant="outline" className="text-[11px] font-semibold text-ink-600">
                {participants.filter((p) => p.trim()).length} members
              </Badge>
            </div>

            <div className="flex flex-col gap-2">
              {participants.map((participant, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="relative flex-1 flex items-center">
                    <Avatar className="absolute left-2.5 h-6 w-6 text-[10px] font-bold bg-leaf-100 text-leaf-800">
                      <AvatarFallback className="bg-leaf-100 text-leaf-800 font-bold">
                        {participant.trim()
                          ? participant.trim().slice(0, 2).toUpperCase()
                          : String(index + 1)}
                      </AvatarFallback>
                    </Avatar>
                    <Input
                      className="pl-10 h-10 text-xs sm:text-sm rounded-xl"
                      maxLength={32}
                      placeholder={`Person ${index + 1}`}
                      value={participant}
                      onChange={(e) =>
                        setParticipants((curr) =>
                          curr.map((item, i) => (i === index ? e.target.value : item))
                        )
                      }
                      onFocus={() => void warmApi()}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-ink-400 hover:text-danger-600 hover:bg-danger-50 rounded-xl shrink-0"
                    disabled={participants.length <= 2}
                    onClick={() =>
                      setParticipants((curr) =>
                        curr.length <= 2 ? curr : curr.filter((_, i) => i !== index)
                      )
                    }
                    title={participants.length <= 2 ? "Minimum 2 participants required" : "Remove person"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="pt-0.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setParticipants((curr) => [...curr, `Person ${curr.length + 1}`])}
                className="rounded-xl border-dashed border-ink-300 text-ink-600 hover:border-leaf-400 hover:text-leaf-700 h-9 gap-1.5 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5 text-leaf-600" />
                Add Member
              </Button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="creator-submit pt-2">
            <Button
              type="submit"
              size="lg"
              disabled={saving || !canSubmit}
              className="w-full h-11 rounded-xl bg-leaf-600 hover:bg-leaf-700 text-white font-semibold text-sm shadow-sm gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Creating group…
                </>
              ) : (
                "Create Group"
              )}
            </Button>
          </div>
        </form>
      ) : (
        /* Result state matching original LinkPanel layout with current theme */
        <div className="space-y-3.5 pt-1">
          {/* Edit Link Panel */}
          <div className="rounded-2xl border border-leaf-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-2.5">
            <p className="text-xs font-semibold tracking-normal text-ink-500">
              Edit link
            </p>
            <a
              className="mt-1 block break-all font-mono text-sm sm:text-base font-semibold text-leaf-700 underline decoration-leaf-300 underline-offset-4 transition hover:text-leaf-800"
              href={result.editLink}
              target="_blank"
              rel="noreferrer"
            >
              {result.editLink}
            </a>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyLink(result.editLink, "edit")}
                  className={`h-10 min-h-10 w-24 min-w-0 justify-center px-3 text-xs font-semibold gap-1.5 bg-white border-ink-200 transition-colors duration-150 ${
                  copiedKey === "edit"
                    ? "bg-leaf-50 text-leaf-700 border-leaf-300"
                    : "hover:bg-ink-50 text-ink-700"
                }`}
              >
                {copiedKey === "edit" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-leaf-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-ink-500" />
                    <span>Copy</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-10 min-h-10 w-24 min-w-0 justify-center px-3 text-xs font-semibold gap-1.5 bg-white border-ink-200 hover:bg-ink-50 text-ink-700 shadow-2xs"
              >
                <Link to={result.editLink} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 text-ink-500" />
                  <span>Open</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* View Link Panel */}
          <div className="rounded-2xl border border-leaf-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-2.5">
            <p className="text-xs font-semibold tracking-normal text-ink-500">
              View link
            </p>
            <a
              className="mt-1 block break-all font-mono text-sm sm:text-base font-semibold text-leaf-700 underline decoration-leaf-300 underline-offset-4 transition hover:text-leaf-800"
              href={result.viewLink}
              target="_blank"
              rel="noreferrer"
            >
              {result.viewLink}
            </a>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyLink(result.viewLink, "view")}
                  className={`h-10 min-h-10 w-24 min-w-0 justify-center px-3 text-xs font-semibold gap-1.5 bg-white border-ink-200 transition-colors duration-150 ${
                  copiedKey === "view"
                    ? "bg-leaf-50 text-leaf-700 border-leaf-300"
                    : "hover:bg-ink-50 text-ink-700"
                }`}
              >
                {copiedKey === "view" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-leaf-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-ink-500" />
                    <span>Copy</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-10 min-h-10 w-24 min-w-0 justify-center px-3 text-xs font-semibold gap-1.5 bg-white border-ink-200 hover:bg-ink-50 text-ink-700 shadow-2xs"
              >
                <Link to={result.viewLink} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 text-ink-500" />
                  <span>Open</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Reset / Create Another */}
          <div className="flex items-center justify-center pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setResult(null);
                setName("");
                setPin("");
                setParticipants(["Person 1", "Person 2"]);
              }}
              className="text-xs text-leaf-800 hover:text-leaf-950 hover:bg-leaf-100/60 h-8 px-3 rounded-lg gap-1.5 font-semibold transition"
            >
              <Plus className="h-3.5 w-3.5 text-leaf-600" />
              <span>Create another group</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (isDialog) {
    return innerContent;
  }

  return (
    <Card
      className={`transition-colors duration-150 duration-200 rounded-2xl sm:rounded-3xl ${
        result
          ? "border-leaf-300 bg-leaf-50 shadow-sm"
          : "border-ink-200/90 bg-white/95 shadow-sm"
      }`}
    >
      <CardHeader
        className={`p-5 sm:p-6 pb-4 sm:pb-4 border-b transition-colors duration-200 ${
          result ? "border-leaf-200/60" : "border-ink-100"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-leaf-50 text-leaf-800">
              {result ? <CheckCircle2 className="h-5 w-5 text-leaf-700" /> : <Users className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold text-ink-900">
                {result ? "Links generated" : "Create a Group"}
              </CardTitle>
              <CardDescription
                className={`text-xs sm:text-sm mt-0.5 font-medium transition-colors ${
                  result ? "text-leaf-800/80" : "text-ink-500"
                }`}
              >
                {result
                  ? "Use Edit to manage expenses. Share View for read-only access."
                  : "Start splitting bills instantly. No account required."}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 sm:p-6 pt-5">
        {innerContent}
      </CardContent>
    </Card>
  );
}
