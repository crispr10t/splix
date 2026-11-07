import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  HelpCircle,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
  User,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { createGroup, warmApi } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/avatar";
import { CurrencySelect } from "@/components/ui/currency-select";
import { cn } from "@/lib/utils";

export function CreateGroupCard({ isDialog = false, onClose }) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [pin, setPin] = useState("");
  const [participants, setParticipants] = useState(["", ""]);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [errors, setErrors] = useState({});
  const [showPinInfo, setShowPinInfo] = useState(false);

  const nameRef = useRef(null);
  const pinRef = useRef(null);
  const memberRefs = useRef([]);
  const pinTooltipRef = useRef(null);
  const pendingFocusIndex = useRef(null);

  useEffect(() => {
    if (!showPinInfo) return;

    const handlePointerDown = (event) => {
      if (pinTooltipRef.current && !pinTooltipRef.current.contains(event.target)) {
        setShowPinInfo(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowPinInfo(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showPinInfo]);

  const handleAddMember = () => {
    pendingFocusIndex.current = participants.length;
    setParticipants((curr) => [...curr, ""]);
    if (errors.members) {
      setErrors((prev) => ({
        ...prev,
        members: null,
        memberIndex: null
      }));
    }
  };

  useEffect(() => {
    if (pendingFocusIndex.current !== null) {
      const idx = pendingFocusIndex.current;
      pendingFocusIndex.current = null;
      const el = memberRefs.current[idx];
      if (el) {
        el.focus({ preventScroll: true });
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [participants.length]);

  const validMemberCount = useMemo(
    () => participants.filter((p) => p.trim().length > 0).length,
    [participants]
  );

  const canSubmit = useMemo(
    () => Boolean(name.trim() && /^\d{4}$/.test(pin) && validMemberCount >= 2),
    [name, pin, validMemberCount]
  );

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

  async function onSubmit(event) {
    event.preventDefault();
    if (saving) return;

    const trimmedName = name.trim();
    const newErrors = {};

    if (!trimmedName) {
      newErrors.name = "Please enter a group name.";
    }

    if (!/^\d{4}$/.test(pin)) {
      newErrors.pin = "PIN must be exactly 4 digits.";
    }

    const participantEntries = participants.map((p, index) => ({
      index,
      trimmed: p.trim()
    }));
    const nonEmptyEntries = participantEntries.filter((p) => p.trimmed.length > 0);

    let memberError = null;
    let invalidMemberIndex = -1;

    if (nonEmptyEntries.length < 2) {
      memberError = "Please provide names for at least 2 members.";
      if (!participants[0]?.trim()) {
        invalidMemberIndex = 0;
      } else if (!participants[1]?.trim()) {
        invalidMemberIndex = 1;
      } else {
        invalidMemberIndex = 0;
      }
    } else {
      const seen = new Map();
      for (const entry of nonEmptyEntries) {
        const lower = entry.trimmed.toLowerCase();
        if (seen.has(lower)) {
          memberError = "Member names must be unique.";
          invalidMemberIndex = entry.index;
          break;
        }
        seen.set(lower, entry.index);
      }
    }

    if (memberError) {
      newErrors.members = memberError;
      newErrors.memberIndex = invalidMemberIndex;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.name) {
        nameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        nameRef.current?.focus({ preventScroll: true });
      } else if (newErrors.pin) {
        pinRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        pinRef.current?.focus({ preventScroll: true });
      } else if (invalidMemberIndex >= 0 && memberRefs.current[invalidMemberIndex]) {
        memberRefs.current[invalidMemberIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
        memberRefs.current[invalidMemberIndex]?.focus({ preventScroll: true });
      }
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const cleanParticipants = participants
        .map((participant) => participant.trim())
        .filter((participant) => participant.length > 0)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }))
        .map((pName) => ({ name: pName }));

      const data = await createGroup({
        name: trimmedName,
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
            <h2 className="text-lg font-bold font-sans text-ink-900 leading-tight">
              {result ? "Links generated" : "Create a Group"}
            </h2>
            <p className={`text-xs mt-0.5 font-sans ${result ? "text-leaf-800 font-medium" : "text-ink-500"}`}>
              {result ? "Use Edit to manage expenses. Share View for read-only access." : "Start splitting bills instantly."}
            </p>
          </div>
        </div>
      )}

      {!result ? (
        <form className="space-y-4" onSubmit={onSubmit}>
          {/* Group Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-700 font-sans">Group Name</label>
            <div className="relative">
              <Input
                id="group-name-input"
                ref={nameRef}
                autoFocus={isDialog}
                className={cn(
                  "pl-9 h-11 text-sm rounded-xl font-sans",
                  errors.name && "border-danger-500 focus-visible:ring-danger-200"
                )}
                maxLength={50}
                placeholder="e.g. Goa Trip, Flat 402"
                value={name}
                enterKeyHint="next"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    pinRef.current?.focus();
                  }
                }}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) {
                    setErrors((prev) => ({ ...prev, name: null }));
                  }
                }}
                onFocus={() => void warmApi()}
              />
              <Users className="absolute left-3 top-3.5 h-4 w-4 text-ink-400" />
            </div>
            {errors.name && (
              <p className="text-danger-600 text-xs mt-1 font-medium font-sans">
                {errors.name}
              </p>
            )}
          </div>

          {/* Currency & PIN */}
          <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center h-5">
                <label className="text-xs font-semibold text-ink-700 block font-sans">Currency</label>
              </div>
              <CurrencySelect
                value={currency}
                onChange={setCurrency}
                onFocus={() => void warmApi()}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 h-5">
                <label className="text-xs font-semibold text-ink-700 block font-sans">PIN</label>
                <div ref={pinTooltipRef} className="relative inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPinInfo((prev) => !prev)}
                    onMouseEnter={() => setShowPinInfo(true)}
                    onMouseLeave={() => setShowPinInfo(false)}
                    className="relative inline-flex items-center justify-center !min-h-0 !min-w-0 h-5 w-5 p-0 text-ink-400 hover:text-ink-700 transition-colors rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-leaf-400 cursor-pointer before:absolute before:-inset-3 before:content-[''] touch-manipulation"
                    aria-label="PIN information"
                    aria-expanded={showPinInfo}
                    aria-describedby={showPinInfo ? "pin-tooltip-text" : undefined}
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                  {showPinInfo && (
                    <div
                      id="pin-tooltip-text"
                      role="tooltip"
                      className="absolute top-full right-0 lg:right-auto lg:-left-2 mt-1.5 w-52 sm:w-56 z-50 pointer-events-none"
                    >
                      <div className="relative p-2.5 rounded-xl bg-ink-950 text-white text-[11px] font-normal leading-relaxed shadow-xl animate-fade-up">
                        <span>4-digit code that protects your edit link. Share it only with people who should edit.</span>
                        <div className="absolute bottom-full right-1.5 lg:right-auto lg:left-[18px] lg:-translate-x-1/2 border-4 border-transparent border-b-ink-950" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative">
                <Input
                  ref={pinRef}
                  className={cn(
                    "pl-9 font-sans tracking-normal text-sm rounded-xl h-11",
                    errors.pin && "border-danger-500 focus-visible:ring-danger-200"
                  )}
                  placeholder="••••"
                  maxLength={4}
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={pin}
                  enterKeyHint="next"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      memberRefs.current[0]?.focus();
                    }
                  }}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ""));
                    if (errors.pin) {
                      setErrors((prev) => ({ ...prev, pin: null }));
                    }
                  }}
                  onFocus={() => void warmApi()}
                />
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-ink-400" />
              </div>
              {errors.pin && (
                <p className="text-danger-600 text-xs mt-1 font-medium font-sans">
                  {errors.pin}
                </p>
              )}
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink-700 font-sans">Group Members</label>
              {validMemberCount > 0 && (
                <Badge variant="outline" className="text-[11px] font-semibold text-ink-600 font-sans">
                  {validMemberCount === 1
                    ? "1 member"
                    : `${validMemberCount} members`}
                </Badge>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {participants.map((participant, index) => {
                const isInvalid = errors.memberIndex === index;
                const placeholder = index === 0 ? "Your name" : "Friend's name";

                return (
                  <div key={index} className="space-y-1">
                    <div className="relative flex items-center">
                      {(() => {
                        const hasName = Boolean(participant.trim());
                        if (hasName) {
                          return (
                            <UserAvatar
                              name={participant}
                              size="xs"
                              className="absolute left-2.5 h-6 w-6 pointer-events-none shadow-2xs"
                            />
                          );
                        }
                        return (
                          <span
                            className="absolute left-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink-100 text-ink-400 pointer-events-none"
                            aria-hidden="true"
                          >
                            <User className="h-3.5 w-3.5" />
                          </span>
                        );
                      })()}
                      <Input
                        ref={(el) => {
                          if (el) memberRefs.current[index] = el;
                          else delete memberRefs.current[index];
                        }}
                        className={cn(
                          "pl-10 h-10 text-xs sm:text-sm rounded-xl font-sans",
                          index >= 2 ? "pr-9" : "pr-3",
                          isInvalid && "border-danger-500 focus-visible:ring-danger-200"
                        )}
                        maxLength={32}
                        placeholder={placeholder}
                        value={participant}
                        enterKeyHint={index < participants.length - 1 || participant.trim() ? "next" : "done"}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (index < participants.length - 1) {
                              memberRefs.current[index + 1]?.focus();
                            } else if (participant.trim()) {
                              handleAddMember();
                            }
                          }
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          setParticipants((curr) =>
                            curr.map((item, i) => (i === index ? val : item))
                          );
                          if (errors.members) {
                            setErrors((prev) => ({
                              ...prev,
                              members: null,
                              memberIndex: null
                            }));
                          }
                        }}
                        onFocus={() => void warmApi()}
                      />
                      {index >= 2 && (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 !min-h-0 !min-w-0 h-7 w-7 inline-flex items-center justify-center p-0 text-ink-400 hover:text-danger-600 hover:bg-danger-50 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-danger-400 cursor-pointer"
                          onClick={() => {
                            setParticipants((curr) =>
                              curr.filter((_, i) => i !== index)
                            );
                            if (errors.members) {
                              setErrors((prev) => ({
                                ...prev,
                                members: null,
                                memberIndex: null
                              }));
                            }
                          }}
                          aria-label={`Remove ${participant.trim() || placeholder}`}
                          title="Remove person"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {isInvalid && errors.members && (
                      <p className="text-danger-600 text-xs mt-1 font-medium font-sans">
                        {errors.members}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-0.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMember}
                className="rounded-xl border-dashed border-ink-300 text-ink-600 hover:border-leaf-400 hover:text-leaf-700 h-9 gap-1.5 text-xs font-semibold font-sans"
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
              disabled={saving}
              className={cn(
                "w-full h-11 rounded-xl font-semibold text-sm shadow-sm gap-2 font-sans transition-colors duration-200 active:scale-[0.98]",
                canSubmit
                  ? "bg-leaf-600 hover:bg-leaf-700 text-white shadow-leaf-900/10 ring-2 ring-leaf-400/25 cursor-pointer"
                  : "bg-ink-100 text-ink-400 hover:bg-ink-200 hover:text-ink-600 border border-ink-200/60 cursor-pointer"
              )}
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
            {!canSubmit && (
              <p className="text-xs text-ink-600 text-center font-sans mt-2 animate-fade-up">
                Add a group name, 4-digit PIN, and at least 2 members
              </p>
            )}
          </div>
        </form>
      ) : (
        /* Result state matching original LinkPanel layout with current theme */
        <div className="space-y-3.5 pt-1">
          {/* Edit Link Panel */}
          <div className="rounded-2xl border border-leaf-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-2.5">
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
                className="h-10 min-h-10 w-24 min-w-0 justify-center px-3 text-xs font-semibold gap-1.5 bg-white border-ink-200 hover:bg-ink-50 text-ink-700 shadow-sm"
              >
                <Link to={result.editLink} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 text-ink-500" />
                  <span>Open</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* View Link Panel */}
          <div className="rounded-2xl border border-leaf-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-2.5">
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
                className="h-10 min-h-10 w-24 min-w-0 justify-center px-3 text-xs font-semibold gap-1.5 bg-white border-ink-200 hover:bg-ink-50 text-ink-700 shadow-sm"
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
                setCurrency("INR");
                setParticipants(["", ""]);
                setErrors({});
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
      className={`transition-all duration-200 rounded-2xl border ${
        result
          ? "border-leaf-300 bg-leaf-50 shadow-md"
          : "border-ink-200/80 bg-white shadow-xl shadow-leaf-950/[0.04]"
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
              <CardTitle className="text-lg sm:text-xl font-bold font-sans text-ink-900">
                {result ? "Links generated" : "Create a Group"}
              </CardTitle>
              <CardDescription
                className={`text-xs sm:text-sm mt-0.5 font-sans font-medium transition-colors ${
                  result ? "text-leaf-800/80" : "text-ink-500"
                }`}
              >
                {result
                  ? "Use Edit to manage expenses. Share View for read-only access."
                  : "Start splitting bills instantly."}
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
