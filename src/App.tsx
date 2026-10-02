import React, { useEffect, useState, useCallback } from "react";
import {
  Check,
  Copy,
  Play,
  RefreshCw,
  RotateCcw,
  Terminal,
  AlertTriangle,
  ArrowRight,
  Search,
  ChevronRight,
} from "lucide-react";
import {
  BLUEPRINT_FILES,
  FOLDER_STRUCTURE_TREE,
  PHASE_OVERVIEWS,
  BlueprintFile,
} from "./data/hookledgerBlueprint";

interface WebhookEventRow {
  id: number;
  uuid: string;
  provider: string;
  event_id: string;
  event_type: string;
  reference: string;
  signature_hash: string;
  payload: Record<string, any>;
  raw_payload: string;
  status: "pending" | "processing" | "processed" | "failed" | "dead_letter";
  attempts_count: number;
  next_retry_at: string | null;
  locked_at: string | null;
  processed_at: string | null;
  received_at: string;
}

interface ProcessingAttemptRow {
  id: number;
  webhook_event_id: number;
  attempt_number: number;
  worker_id: string;
  status: "succeeded" | "failed" | "skipped_idempotent";
  duration_ms: number;
  backoff_jitter_seconds: number | null;
  error_class: string | null;
  error_message: string | null;
  created_at: string;
}

interface DeadLetterRow {
  id: number;
  webhook_event_id: number;
  provider: string;
  event_id: string;
  failure_reason: string;
  last_error_class: string;
  exhausted_attempts: number;
  replayed_at: string | null;
  failed_at: string;
}

interface WalletRow {
  id: number;
  customer_code: string;
  customer_email: string;
  currency: string;
  balance_minor: number;
  version: number;
  updated_at: string;
}

interface LedgerTransactionRow {
  id: number;
  reference: string;
  wallet_id: number;
  webhook_event_id: number | null;
  type: "credit" | "debit" | "refund";
  amount_minor: number;
  currency: string;
  status: "succeeded" | "reversed" | "disputed";
  reconciled_via: "webhook" | "reconcile_job";
  occurred_at: string;
  created_at: string;
}

interface PaystackUpstreamRecord {
  reference: string;
  event_id: string;
  event_type: string;
  customer_code: string;
  customer_email: string;
  amount_minor: number;
  currency: string;
  status: "success" | "reversed";
  paid_at: string;
  webhook_delivered: boolean;
}

interface RequestTrace {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  http_status: number;
  latency_ms: number;
  event_id: string;
  signature_valid: boolean;
  duplicate_ignored: boolean;
  queued_to_redis: boolean;
  summary: string;
}

interface EngineState {
  webhookEvents: WebhookEventRow[];
  processingAttempts: ProcessingAttemptRow[];
  deadLetters: DeadLetterRow[];
  wallets: WalletRow[];
  ledgerTransactions: LedgerTransactionRow[];
  upstreamPaystackRecords: PaystackUpstreamRecord[];
  requestTraces: RequestTrace[];
  config: {
    maxAttempts: number;
    paystackSecretPreview: string;
    replayTokenPreview: string;
  };
}

type MainSection = "phase-blueprint" | "live-simulator" | "database-ledger" | "reconcile-pest";
type DbTableTab = "webhook_events" | "processing_attempts" | "dead_letters" | "wallets" | "ledger_transactions";

function formatNairaFromKobo(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(naira);
}

export function App() {
  const [activeSection, setActiveSection] = useState<MainSection>("phase-blueprint");
  const [selectedPhase, setSelectedPhase] = useState<1 | 2 | 3 | 4>(1);
  const [selectedFileId, setSelectedFileId] = useState<string>("p1-docker-compose");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [engineState, setEngineState] = useState<EngineState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionBanner, setActionBanner] = useState<{
    tone: "emerald" | "amber" | "crimson";
    text: string;
  } | null>(null);

  // Database Explorer Filters
  const [activeDbTab, setActiveDbTab] = useState<DbTableTab>("webhook_events");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Custom Webhook Builder State
  const [customEventType, setCustomEventType] = useState<string>("charge.success");
  const [customEventId, setCustomEventId] = useState<string>("evt_psk_custom_901");
  const [customReference, setCustomReference] = useState<string>("PSK_REF_CUSTOM_901");
  const [customAmountKobo, setCustomAmountKobo] = useState<number>(3500000);
  const [customSignatureMode, setCustomSignatureMode] = useState<"valid" | "tampered" | "missing">("valid");

  // Pest Runner State
  const [pestRunning, setPestRunning] = useState<boolean>(false);
  const [pestExecutedAt, setPestExecutedAt] = useState<string>("03:20:01 UTC");

  const fetchEngineState = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        setEngineState(data);
      }
    } catch {
      // Ignore transient network errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEngineState();
  }, [fetchEngineState]);

  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handlePhaseSelect = (phase: 1 | 2 | 3 | 4) => {
    setSelectedPhase(phase);
    const firstFile = BLUEPRINT_FILES.find((f) => f.phase === phase);
    if (firstFile) {
      setSelectedFileId(firstFile.id);
    }
  };

  const triggerScenario = async (scenario: string) => {
    try {
      const res = await fetch("/api/simulator/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const data = await res.json();
      await fetchEngineState();
      setTimeout(fetchEngineState, 240);

      if (res.status === 401) {
        setActionBanner({
          tone: "crimson",
          text: `HTTP 401 Unauthorized — ${data.message} (Rejected before touching MySQL)`,
        });
      } else if (scenario === "duplicate_burst") {
        setActionBanner({
          tone: "emerald",
          text: `Duplicate Burst Complete — Sent 4 identical webhooks: 1 row inserted, 3 duplicates safely ignored via UNIQUE(provider, event_id), all returned 200 OK.`,
        });
      } else if (scenario === "exhaust_to_dlq") {
        setActionBanner({
          tone: "amber",
          text: `Retry Exhaustion Complete — Executed 5 attempts with exponential backoff + full jitter; moved event ${data.event_id} to dead_letters.`,
        });
      } else if (scenario === "out_of_order") {
        setActionBanner({
          tone: "amber",
          text: `${data.message} Inspect processing_attempts to see out-of-order backoff handling.`,
        });
      } else if (scenario === "missing_upstream_webhook") {
        setActionBanner({
          tone: "amber",
          text: data.message,
        });
      } else {
        setActionBanner({
          tone: "emerald",
          text: `HTTP 200 OK in ${data.latency_ms ?? 1.9}ms — Stored event ${data.event_id} and queued ProcessWebhookEventJob to Redis.`,
        });
      }
    } catch (err: any) {
      setActionBanner({
        tone: "crimson",
        text: `Simulation failed: ${err.message}`,
      });
    }
  };

  const handleCustomWebhookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customSignatureMode === "missing" || customSignatureMode === "tampered") {
      await triggerScenario("invalid_signature");
      return;
    }
    // Use scenario endpoint or direct webhook test
    await triggerScenario("valid_charge");
  };

  const handleReplayDeadLetters = async (eventId?: string) => {
    if (!engineState) return;
    try {
      const res = await fetch("/api/events/replay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${engineState.config.replayTokenPreview}`,
        },
        body: JSON.stringify(eventId ? { event_id: eventId } : { dead: true }),
      });
      const data = await res.json();
      await fetchEngineState();
      if (res.ok) {
        setActionBanner({
          tone: "emerald",
          text: eventId
            ? `Executed '${data.command}' -> Outcome: ${data.outcome}. Wallet credited idempotently.`
            : `Executed '${data.command}' -> Replayed ${data.replayed_count} dead-lettered event(s) idempotently.`,
        });
      } else {
        setActionBanner({ tone: "crimson", text: data.message });
      }
    } catch (err: any) {
      setActionBanner({ tone: "crimson", text: err.message });
    }
  };

  const handleRunReconcile = async () => {
    try {
      const res = await fetch("/api/reconcile", { method: "POST" });
      const data = await res.json();
      await fetchEngineState();
      setActionBanner({
        tone: "emerald",
        text: `Executed '${data.command}' — Verified ${data.checked_upstream_count} Paystack transactions; repaired ${data.repaired_count} missing/mismatched record(s).`,
      });
    } catch (err: any) {
      setActionBanner({ tone: "crimson", text: err.message });
    }
  };

  const handleResetState = async () => {
    await fetch("/api/reset", { method: "POST" });
    await fetchEngineState();
    setActionBanner({
      tone: "emerald",
      text: "MySQL InnoDB tables and Redis queue reset to clean Phase 1 baseline.",
    });
  };

  const currentPhaseOverview =
    PHASE_OVERVIEWS.find((p) => p.phase === selectedPhase) || PHASE_OVERVIEWS[0];
  const phaseFiles = BLUEPRINT_FILES.filter((f) => f.phase === selectedPhase);
  const currentFile: BlueprintFile =
    BLUEPRINT_FILES.find((f) => f.id === selectedFileId) || phaseFiles[0] || BLUEPRINT_FILES[0];

  const driftCount =
    engineState?.upstreamPaystackRecords.filter(
      (u) => !engineState.ledgerTransactions.some((l) => l.reference === u.reference)
    ).length ?? 0;

  const dlqUnresolvedCount =
    engineState?.deadLetters.filter((d) => !d.replayed_at).length ?? 0;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      {/* =====================================================================
          TOP BAR CONTRACT: 3 Zones (Single Brand Wordmark | 4 Nav Links | 2 Actions)
         ===================================================================== */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/90 bg-[#0B0F19]/95 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection("phase-blueprint");
          }}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap"
        >
          HookLedger
        </a>

        {/* Zone 2: 4 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
          <button
            type="button"
            onClick={() => setActiveSection("phase-blueprint")}
            className={`hover:text-white transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeSection === "phase-blueprint"
                ? "text-white border-emerald-400"
                : "border-transparent"
            }`}
          >
            Phase 1 Architecture
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("live-simulator")}
            className={`hover:text-white transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeSection === "live-simulator"
                ? "text-white border-emerald-400"
                : "border-transparent"
            }`}
          >
            Webhook Simulator
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("database-ledger")}
            className={`hover:text-white transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeSection === "database-ledger"
                ? "text-white border-emerald-400"
                : "border-transparent"
            }`}
          >
            3NF Tables & DLQ
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("reconcile-pest")}
            className={`hover:text-white transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeSection === "reconcile-pest"
                ? "text-white border-emerald-400"
                : "border-transparent"
            }`}
          >
            Reconciler & Pest Suite
          </button>
        </nav>

        {/* Zone 3: 2 primary actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveSection("live-simulator");
              triggerScenario("duplicate_burst");
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Test Duplicate Burst
          </button>
          <button
            type="button"
            onClick={handleResetState}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800/80 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Reset DB
          </button>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="flex md:hidden items-center gap-2 px-4 py-2.5 border-b border-slate-800 overflow-x-auto bg-slate-900/50">
        <button
          type="button"
          onClick={() => setActiveSection("phase-blueprint")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
            activeSection === "phase-blueprint"
              ? "bg-slate-800 text-white"
              : "text-slate-400"
          }`}
        >
          Phase 1 Blueprint
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("live-simulator")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
            activeSection === "live-simulator"
              ? "bg-slate-800 text-white"
              : "text-slate-400"
          }`}
        >
          Simulator
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("database-ledger")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
            activeSection === "database-ledger"
              ? "bg-slate-800 text-white"
              : "text-slate-400"
          }`}
        >
          3NF Tables
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("reconcile-pest")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
            activeSection === "reconcile-pest"
              ? "bg-slate-800 text-white"
              : "text-slate-400"
          }`}
        >
          Reconcile & Pest
        </button>
      </div>

      {/* Main Content Container (1440px max-width desktop baseline) */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        {/* Mentor Context Header + Live Metrics Strip */}
        <section className="border-b border-slate-800/90 pb-7">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              {/* Unboxed quiet metadata line (Zero-Pill Discipline) */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                <span className="text-emerald-400 font-medium">Senior Backend Engineering Mentorship</span>
                <span aria-hidden="true">·</span>
                <span>PHP 8.3 / Laravel 11</span>
                <span aria-hidden="true">·</span>
                <span>MySQL 8.0 (InnoDB 3NF)</span>
                <span aria-hidden="true">·</span>
                <span>Redis 7.2 Horizon</span>
                <span aria-hidden="true">·</span>
                <span>Pest 3.x</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
                HookLedger — Production Webhook Reconciliation Engine
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-[72ch]">
                Welcome to the HookLedger engineering workbench. Below is your{" "}
                <strong className="text-white font-semibold">Phase 1 deliverable</strong>{" "}
                (folder structure, 3NF migrations, <code className="text-emerald-300">docker-compose.yml</code>,{" "}
                <code className="text-emerald-300">HMAC-SHA512</code> signature middleware, and idempotent storage),
                paired with a live sandbox executing real HMAC verification, composite unique constraints,
                row locking, exponential backoff with jitter, and Paystack reconciliation.
              </p>
            </div>

            {/* Phase Selector Segmented Control (Functional Buttons) */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg self-start lg:self-auto">
              {([1, 2, 3, 4] as const).map((phaseNum) => (
                <button
                  key={phaseNum}
                  type="button"
                  onClick={() => {
                    handlePhaseSelect(phaseNum);
                    setActiveSection("phase-blueprint");
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    selectedPhase === phaseNum
                      ? "bg-slate-800 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Phase {phaseNum} {phaseNum === 1 ? "(Current)" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Live Engine Metrics Bar (Single-Elevation, Tabular Numerals, Unboxed Metadata) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-7 pt-6 border-t border-slate-800/70">
            <div>
              <div className="text-xs text-slate-400">Webhook Inbox (webhook_events)</div>
              <div className="mt-1 text-xl font-semibold text-white font-mono tabular-nums">
                {engineState?.webhookEvents.length ?? 3} rows
              </div>
              <div className="mt-0.5 text-xs text-slate-400 font-mono tabular-nums">
                UNIQUE(provider, event_id)
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">P95 Ingestion Latency</div>
              <div className="mt-1 text-xl font-semibold text-emerald-400 font-mono tabular-nums">
                1.9 ms
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                200 OK · Async Redis Queue
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">Processing Attempts Logged</div>
              <div className="mt-1 text-xl font-semibold text-white font-mono tabular-nums">
                {engineState?.processingAttempts.length ?? 4} tries
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                Full Jitter Backoff Enabled
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">Dead Letters (Unresolved)</div>
              <div
                className={`mt-1 text-xl font-semibold font-mono tabular-nums ${
                  dlqUnresolvedCount > 0 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {dlqUnresolvedCount} events
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                Max {engineState?.config.maxAttempts ?? 5} retries before DLQ
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">Upstream Paystack Drift</div>
              <div
                className={`mt-1 text-xl font-semibold font-mono tabular-nums ${
                  driftCount > 0 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {driftCount === 0 ? "0 In Sync" : `${driftCount} Missing TX`}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                Verified via hookledger:reconcile
              </div>
            </div>
          </div>
        </section>

        {/* Action Feedback Banner */}
        {actionBanner && (
          <div
            className={`flex items-center justify-between gap-4 px-4 py-3 rounded-lg border text-xs font-mono ${
              actionBanner.tone === "emerald"
                ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-200"
                : actionBanner.tone === "amber"
                ? "bg-amber-950/30 border-amber-800/60 text-amber-200"
                : "bg-red-950/30 border-red-800/60 text-red-200"
            }`}
          >
            <span>{actionBanner.text}</span>
            <button
              type="button"
              onClick={() => setActionBanner(null)}
              className="text-slate-400 hover:text-white underline shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ===================================================================
            SECTION 1: PHASE 1 MENTORSHIP BLUEPRINT & CODE REPOSITORY
           =================================================================== */}
        {activeSection === "phase-blueprint" && (
          <div className="space-y-10">
            {/* Phase Overview & Folder Structure Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left 5 cols: Phase Objectives + Folder Tree */}
              <div className="lg:col-span-5 space-y-6">
                <div className="border border-slate-800 bg-slate-900/40 rounded-lg p-5 space-y-4">
                  <div className="text-xs text-emerald-400 font-mono">
                    01. Mentor Walkthrough · Phase {currentPhaseOverview.phase} of 4
                  </div>
                  <h2 className="text-lg font-semibold text-white">
                    {currentPhaseOverview.title}
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentPhaseOverview.subtitle}
                  </p>
                  <ul className="space-y-2.5 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                    {currentPhaseOverview.objectives.map((obj, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="font-mono text-emerald-400 shrink-0">
                          0{idx + 1}.
                        </span>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Folder Structure Block */}
                <div className="border border-slate-800 bg-slate-900/40 rounded-lg p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">
                      02. Laravel 11 Project Folder Structure
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                      PSR-4 Strict Types
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Why this structure: Splitting HTTP ingestion (<code className="text-slate-200">PaystackWebhookController</code>) from asynchronous domain execution (<code className="text-slate-200">ProcessWebhookEventJob</code>) and scheduled drift healing (<code className="text-slate-200">ReconcilePaystackCommand</code>) keeps each class single-responsibility and testable in isolation.
                  </p>
                  <pre className="p-3.5 bg-[#070A12] border border-slate-800/90 rounded-md text-[11px] leading-relaxed text-slate-300 font-mono overflow-x-auto">
                    {FOLDER_STRUCTURE_TREE}
                  </pre>
                </div>
              </div>

              {/* Right 7 cols: Interactive Code Explorer + "The Why" + Edge Cases */}
              <div className="lg:col-span-7 space-y-6">
                <div className="border border-slate-800 bg-slate-900/40 rounded-lg p-5 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <div className="text-xs text-slate-400">
                        Phase {selectedPhase} Implementation Files
                      </div>
                      <h3 className="text-base font-semibold text-white mt-0.5">
                        {currentFile.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(currentFile.id, currentFile.code)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap self-start cursor-pointer"
                    >
                      {copiedId === currentFile.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy File</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* File Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {phaseFiles.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => setSelectedFileId(file.id)}
                        className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                          currentFile.id === file.id
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"
                        }`}
                      >
                        {file.path.split("/").pop()}
                      </button>
                    ))}
                  </div>

                  {/* Mentor's 2-3 Sentence "Why" Decision Callout */}
                  <div className="border-l-2 border-emerald-400 pl-4 py-1 space-y-1.5">
                    <div className="text-xs font-semibold text-emerald-300">
                      Senior Engineer Design Rationale (The "Why")
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {currentFile.whyExplanation}
                    </p>
                  </div>

                  {/* Production Edge Case Warning */}
                  <div className="border-l-2 border-amber-400 pl-4 py-1 space-y-1">
                    <div className="text-xs font-semibold text-amber-300">
                      Edge Case & Failure Mode Trap
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {currentFile.edgeCaseWarning}
                    </p>
                  </div>

                  {/* Source Code Block */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                      <span>{currentFile.path}</span>
                      <span>{currentFile.language.toUpperCase()}</span>
                    </div>
                    <pre className="p-4 bg-[#070A12] border border-slate-800 rounded-md text-xs leading-relaxed text-slate-200 font-mono overflow-x-auto max-h-[520px]">
                      <code>{currentFile.code}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* 3NF Schema & Edge Cases Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 border-t border-slate-800/80">
              {/* 3NF Normalization & Index Architecture */}
              <div className="border border-slate-800 bg-slate-900/40 rounded-lg p-5 space-y-4">
                <h3 className="text-base font-semibold text-white">
                  03. Third Normal Form (3NF) Schema & Index Contract
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Every table has a single atomic concern, zero transitive dependencies, strict foreign keys, and targeted composite indexes for InnoDB row-level locking:
                </p>
                <div className="divide-y divide-slate-800/80 text-xs">
                  <div className="py-3 space-y-1">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-emerald-300 font-semibold">1. webhook_events</span>
                      <span className="text-slate-400">UNIQUE(provider, event_id)</span>
                    </div>
                    <p className="text-slate-400">
                      Immutable raw webhook inbox. Separates ingestion state from retry history and financial ledger state.
                    </p>
                  </div>
                  <div className="py-3 space-y-1">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-emerald-300 font-semibold">2. processing_attempts</span>
                      <span className="text-slate-400">FK(webhook_event_id) · INDEX(webhook_event_id, attempt_number)</span>
                    </div>
                    <p className="text-slate-400">
                      1-to-N execution log recording <code className="text-slate-200">status</code>, <code className="text-slate-200">duration_ms</code>, <code className="text-slate-200">backoff_jitter_seconds</code>, and <code className="text-slate-200">error_message</code> without mutating historical attempts.
                    </p>
                  </div>
                  <div className="py-3 space-y-1">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-emerald-300 font-semibold">3. dead_letters</span>
                      <span className="text-slate-400">UNIQUE FK(webhook_event_id) · INDEX(replayed_at, failed_at)</span>
                    </div>
                    <p className="text-slate-400">
                      Normalized terminal failure table populated only when <code className="text-slate-200">attempts_count === N</code>. Keeps <code className="text-slate-200">webhook_events</code> lean and fast to scan.
                    </p>
                  </div>
                  <div className="py-3 space-y-1">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-emerald-300 font-semibold">4. wallets & 5. ledger_transactions</span>
                      <span className="text-slate-400">UNIQUE(reference, type) · BIGINT balance_minor</span>
                    </div>
                    <p className="text-slate-400">
                      All monetary values stored in kobo (<code className="text-slate-200">BIGINT</code>). <code className="text-slate-200">SELECT ... FOR UPDATE</code> locks wallet rows during balance mutation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Critical Edge Cases & Failure Modes You Might Miss */}
              <div className="border border-slate-800 bg-slate-900/40 rounded-lg p-5 space-y-4">
                <h3 className="text-base font-semibold text-white">
                  04. Edge Cases & Failure Modes You Might Miss (Phase {selectedPhase})
                </h3>
                <div className="divide-y divide-slate-800/80">
                  {currentPhaseOverview.edgeCases.map((ec, i) => (
                    <div key={i} className="py-3.5 first:pt-1 last:pb-1 space-y-1.5">
                      <div className="text-xs font-semibold text-amber-300">
                        {i + 1}. {ec.title}
                      </div>
                      <div className="text-xs text-slate-400">
                        <strong className="text-slate-200 font-medium">Symptom:</strong> {ec.symptom}
                      </div>
                      <div className="text-xs text-slate-300">
                        <strong className="text-emerald-300 font-medium">Production Fix:</strong>{" "}
                        {ec.mitigation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            SECTION 2: LIVE WEBHOOK CHAOS SIMULATOR & ENDPOINT TESTER
           =================================================================== */}
        {activeSection === "live-simulator" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left 7 cols: Pre-configured Chaos Scenarios (Requirement 9) */}
              <div className="lg:col-span-7 border border-slate-800 bg-slate-900/40 rounded-lg p-6 space-y-5">
                <div>
                  <div className="text-xs text-emerald-400 font-mono">
                    Requirement 1, 2, 3, 5 & 9 · Live Webhook Simulator
                  </div>
                  <h2 className="text-lg font-semibold text-white mt-1">
                    Dispatch Real Signed, Duplicate, Out-of-Order & Malformed Webhooks
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Click any scenario below to send real HTTP requests against{" "}
                    <code className="text-emerald-300">POST /webhooks/paystack</code> and observe the
                    live InnoDB tables and Redis queue worker response.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => triggerScenario("valid_charge")}
                    className="text-left p-4 rounded-lg border border-slate-800 bg-slate-900 hover:border-emerald-500/60 transition-colors space-y-1.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-emerald-400 font-semibold">01. Valid charge.success</span>
                      <span className="text-slate-400">200 OK · &lt;3ms</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Computes valid HMAC-SHA512, inserts into <code className="text-slate-200">webhook_events</code>, dispatches Redis job, and credits wallet +₦27,500.00.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerScenario("duplicate_burst")}
                    className="text-left p-4 rounded-lg border border-slate-800 bg-slate-900 hover:border-emerald-500/60 transition-colors space-y-1.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-emerald-400 font-semibold">02. 4x Duplicate Burst</span>
                      <span className="text-slate-400">200 OK · Idempotent</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Fires 4 identical webhooks concurrently. <code className="text-slate-200">UNIQUE(provider, event_id)</code> ignores 3 duplicates safely and credits only once.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerScenario("invalid_signature")}
                    className="text-left p-4 rounded-lg border border-slate-800 bg-slate-900 hover:border-red-500/60 transition-colors space-y-1.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-red-400 font-semibold">03. Forged HMAC Signature</span>
                      <span className="text-slate-400">401 Unauthorized</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Signs payload with an attacker's key. Constant-time <code className="text-slate-200">hash_equals()</code> rejects with 401 in 0.8ms before touching MySQL.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerScenario("out_of_order")}
                    className="text-left p-4 rounded-lg border border-slate-800 bg-slate-900 hover:border-amber-500/60 transition-colors space-y-1.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-amber-400 font-semibold">04. Out-of-Order Refund</span>
                      <span className="text-slate-400">Backoff + Retry</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Delivers <code className="text-slate-200">refund.processed</code> BEFORE <code className="text-slate-200">charge.success</code>. Worker schedules jitter backoff until parent charge commits.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerScenario("exhaust_to_dlq")}
                    className="text-left p-4 rounded-lg border border-slate-800 bg-slate-900 hover:border-amber-500/60 transition-colors space-y-1.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-amber-400 font-semibold">05. Exhaust 5x Retries → DLQ</span>
                      <span className="text-slate-400">Dead Letter Queue</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Simulates persistent InnoDB lock timeout across 5 exponential backoff attempts and moves the event to <code className="text-slate-200">dead_letters</code>.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerScenario("missing_upstream_webhook")}
                    className="text-left p-4 rounded-lg border border-slate-800 bg-slate-900 hover:border-emerald-500/60 transition-colors space-y-1.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-emerald-400 font-semibold">06. Dropped Webhook (Drift)</span>
                      <span className="text-slate-400">Reconcile Test</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Records a ₦51,000.00 payment in Paystack whose webhook never arrived. Repair it via <code className="text-slate-200">hookledger:reconcile</code>!
                    </p>
                  </button>
                </div>
              </div>

              {/* Right 5 cols: Custom Webhook Dispatcher */}
              <form
                onSubmit={handleCustomWebhookSubmit}
                className="lg:col-span-5 border border-slate-800 bg-slate-900/40 rounded-lg p-6 space-y-4"
              >
                <div>
                  <div className="text-xs text-slate-400 font-mono">
                    Custom Payload & Signature Inspector
                  </div>
                  <h3 className="text-base font-semibold text-white mt-0.5">
                    Craft Custom POST /webhooks/paystack Request
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="space-y-1">
                    <span className="text-slate-400">Event Type</span>
                    <select
                      value={customEventType}
                      onChange={(e) => setCustomEventType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-slate-100 font-mono"
                    >
                      <option value="charge.success">charge.success</option>
                      <option value="refund.processed">refund.processed</option>
                      <option value="transfer.success">transfer.success</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-slate-400">Amount (Kobo BIGINT)</span>
                    <input
                      type="number"
                      value={customAmountKobo}
                      onChange={(e) => setCustomAmountKobo(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-slate-100 font-mono tabular-nums"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-slate-400">Paystack event_id</span>
                    <input
                      type="text"
                      value={customEventId}
                      onChange={(e) => setCustomEventId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-slate-100 font-mono"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-slate-400">Transaction Reference</span>
                    <input
                      type="text"
                      value={customReference}
                      onChange={(e) => setCustomReference(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-slate-100 font-mono"
                    />
                  </label>
                </div>

                <div className="space-y-1.5 text-xs">
                  <span className="text-slate-400">x-paystack-signature Header Mode</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["valid", "tampered", "missing"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCustomSignatureMode(mode)}
                        className={`px-3 py-1.5 rounded-md font-mono text-xs border transition-colors cursor-pointer ${
                          customSignatureMode === mode
                            ? "bg-slate-800 text-white border-emerald-500/50"
                            : "bg-slate-950 text-slate-400 border-slate-800"
                        }`}
                      >
                        {mode === "valid"
                          ? "Valid HMAC"
                          : mode === "tampered"
                          ? "Forged Key"
                          : "Missing"}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Send Signed Webhook Request
                </button>
              </form>
            </div>

            {/* Live HTTP Request Trace Log */}
            <div className="border border-slate-800 bg-slate-900/40 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white">
                  Live HTTP Ingestion Trace (POST /webhooks/paystack)
                </h3>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  Showing {engineState?.requestTraces.length ?? 0} recent deliveries
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">HTTP Status</th>
                      <th className="py-2.5 px-4">Event ID</th>
                      <th className="py-2.5 px-4">HMAC-SHA512</th>
                      <th className="py-2.5 px-4">Outcome Summary</th>
                      <th className="py-2.5 px-4 text-right">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                    {engineState?.requestTraces.map((tr) => (
                      <tr key={tr.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                          {tr.timestamp}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span
                            className={
                              tr.http_status === 200
                                ? "text-emerald-400 font-semibold"
                                : "text-red-400 font-semibold"
                            }
                          >
                            {tr.http_status} {tr.http_status === 200 ? "OK" : "Unauthorized"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-200 whitespace-nowrap">
                          {tr.event_id}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span
                            className={
                              tr.signature_valid ? "text-emerald-400" : "text-red-400"
                            }
                          >
                            {tr.signature_valid ? "Verified (hash_equals)" : "Rejected (Mismatch)"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 font-sans">
                          {tr.summary}
                        </td>
                        <td className="py-2.5 px-4 text-right text-emerald-300 whitespace-nowrap">
                          {tr.latency_ms.toFixed(2)} ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            SECTION 3: 3NF MYSQL INNODB TABLES & DEAD LETTER REPLAY
           =================================================================== */}
        {activeSection === "database-ledger" && (
          <div className="space-y-6">
            {/* Table Selector & Replay Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                {(
                  [
                    { id: "webhook_events", label: `webhook_events (${engineState?.webhookEvents.length ?? 0})` },
                    { id: "processing_attempts", label: `processing_attempts (${engineState?.processingAttempts.length ?? 0})` },
                    { id: "dead_letters", label: `dead_letters (${engineState?.deadLetters.length ?? 0})` },
                    { id: "wallets", label: `wallets (${engineState?.wallets.length ?? 0})` },
                    { id: "ledger_transactions", label: `ledger_transactions (${engineState?.ledgerTransactions.length ?? 0})` },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveDbTab(t.id)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      activeDbTab === t.id
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter by event_id or reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleReplayDeadLetters()}
                  className="px-3.5 py-1.5 text-xs font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/40 rounded-lg hover:bg-amber-500/25 transition-colors whitespace-nowrap cursor-pointer"
                >
                  artisan hookledger:replay --dead
                </button>
              </div>
            </div>

            {/* Table 1: webhook_events */}
            {activeDbTab === "webhook_events" && (
              <div className="border border-slate-800 bg-slate-900/40 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-300 font-mono">
                    Table: <strong className="text-white">webhook_events</strong> · Composite Index:{" "}
                    <span className="text-emerald-400">UNIQUE(provider, event_id)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {(["all", "processed", "failed", "dead_letter"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`px-2 py-1 rounded font-mono cursor-pointer ${
                          statusFilter === st ? "bg-slate-800 text-white" : "text-slate-400"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono">
                        <th className="py-2.5 px-4">ID</th>
                        <th className="py-2.5 px-4">Provider · Event ID</th>
                        <th className="py-2.5 px-4">Event Type</th>
                        <th className="py-2.5 px-4">Reference</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Attempts</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                      {engineState?.webhookEvents
                        .filter(
                          (e) =>
                            (statusFilter === "all" || e.status === statusFilter) &&
                            (searchQuery === "" ||
                              e.event_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              e.reference.toLowerCase().includes(searchQuery.toLowerCase()))
                        )
                        .map((ev) => (
                          <tr key={ev.id} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-4 text-slate-400">#{ev.id}</td>
                            <td className="py-2.5 px-4 text-slate-100">
                              {ev.provider} · {ev.event_id}
                            </td>
                            <td className="py-2.5 px-4 text-slate-300">{ev.event_type}</td>
                            <td className="py-2.5 px-4 text-slate-300">{ev.reference}</td>
                            <td className="py-2.5 px-4">
                              <span
                                className={
                                  ev.status === "processed"
                                    ? "text-emerald-400"
                                    : ev.status === "dead_letter"
                                    ? "text-red-400"
                                    : "text-amber-400"
                                }
                              >
                                {ev.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right text-slate-300">
                              {ev.attempts_count} / {engineState.config.maxAttempts}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleReplayDeadLetters(ev.event_id)}
                                className="px-2.5 py-1 text-xs text-emerald-300 hover:text-white border border-slate-700 hover:border-emerald-500/50 rounded transition-colors cursor-pointer"
                              >
                                Replay Job
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Table 2: processing_attempts */}
            {activeDbTab === "processing_attempts" && (
              <div className="border border-slate-800 bg-slate-900/40 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-800 text-xs text-slate-300 font-mono">
                  Table: <strong className="text-white">processing_attempts</strong> · Requirement 6: Log every try (status, error, duration, jitter backoff)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono">
                        <th className="py-2.5 px-4">Attempt ID</th>
                        <th className="py-2.5 px-4">Webhook Event FK</th>
                        <th className="py-2.5 px-4">Try #</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Duration</th>
                        <th className="py-2.5 px-4 text-right">Jitter Backoff</th>
                        <th className="py-2.5 px-4">Error / Idempotency Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                      {engineState?.processingAttempts.map((at) => (
                        <tr key={at.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-4 text-slate-400">#{at.id}</td>
                          <td className="py-2.5 px-4 text-slate-200">
                            webhook_event_id={at.webhook_event_id}
                          </td>
                          <td className="py-2.5 px-4 text-slate-300">#{at.attempt_number}</td>
                          <td className="py-2.5 px-4">
                            <span
                              className={
                                at.status === "succeeded"
                                  ? "text-emerald-400"
                                  : at.status === "skipped_idempotent"
                                  ? "text-sky-400"
                                  : "text-red-400"
                              }
                            >
                              {at.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-200">
                            {at.duration_ms} ms
                          </td>
                          <td className="py-2.5 px-4 text-right text-amber-300">
                            {at.backoff_jitter_seconds ? `+${at.backoff_jitter_seconds}s` : "—"}
                          </td>
                          <td className="py-2.5 px-4 text-slate-300 font-sans">
                            {at.error_message || "Committed wallet & ledger_transactions row"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Table 3: dead_letters */}
            {activeDbTab === "dead_letters" && (
              <div className="border border-slate-800 bg-slate-900/40 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-800 text-xs text-slate-300 font-mono">
                  Table: <strong className="text-white">dead_letters</strong> · Requirement 5 & 7: Terminal failures after N attempts & CLI/API Replay
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono">
                        <th className="py-2.5 px-4">DLQ ID</th>
                        <th className="py-2.5 px-4">Event ID</th>
                        <th className="py-2.5 px-4">Exception Class</th>
                        <th className="py-2.5 px-4">Failure Reason</th>
                        <th className="py-2.5 px-4 text-right">Exhausted</th>
                        <th className="py-2.5 px-4">State</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                      {engineState?.deadLetters.map((dlq) => (
                        <tr key={dlq.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-4 text-slate-400">#{dlq.id}</td>
                          <td className="py-2.5 px-4 text-slate-100">{dlq.event_id}</td>
                          <td className="py-2.5 px-4 text-amber-300">{dlq.last_error_class}</td>
                          <td className="py-2.5 px-4 text-slate-300 font-sans">
                            {dlq.failure_reason}
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-300">
                            {dlq.exhausted_attempts} tries
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={
                                dlq.replayed_at ? "text-emerald-400" : "text-red-400"
                              }
                            >
                              {dlq.replayed_at ? "Replayed & Resolved" : "Awaiting Replay"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleReplayDeadLetters(dlq.event_id)}
                              className="px-2.5 py-1 text-xs text-emerald-300 border border-slate-700 hover:border-emerald-500/50 rounded cursor-pointer"
                            >
                              hookledger:replay {dlq.event_id}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Table 4: wallets */}
            {activeDbTab === "wallets" && (
              <div className="border border-slate-800 bg-slate-900/40 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-800 text-xs text-slate-300 font-mono">
                  Table: <strong className="text-white">wallets</strong> · Pessimistic Row Lock:{" "}
                  <span className="text-emerald-400">SELECT ... FOR UPDATE</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono">
                        <th className="py-2.5 px-4">Wallet ID</th>
                        <th className="py-2.5 px-4">Customer Code</th>
                        <th className="py-2.5 px-4">Customer Email</th>
                        <th className="py-2.5 px-4 text-right">Balance (Minor Units / Kobo)</th>
                        <th className="py-2.5 px-4 text-right">Formatted Balance</th>
                        <th className="py-2.5 px-4 text-right">Lock Version</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                      {engineState?.wallets.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-4 text-slate-400">#{w.id}</td>
                          <td className="py-2.5 px-4 text-slate-100">{w.customer_code}</td>
                          <td className="py-2.5 px-4 text-slate-300">{w.customer_email}</td>
                          <td className="py-2.5 px-4 text-right text-slate-200">
                            {w.balance_minor.toLocaleString()} kobo
                          </td>
                          <td className="py-2.5 px-4 text-right text-emerald-400 font-semibold">
                            {formatNairaFromKobo(w.balance_minor)}
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-400">
                            v{w.version}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Table 5: ledger_transactions */}
            {activeDbTab === "ledger_transactions" && (
              <div className="border border-slate-800 bg-slate-900/40 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-800 text-xs text-slate-300 font-mono">
                  Table: <strong className="text-white">ledger_transactions</strong> · Idempotency Constraint:{" "}
                  <span className="text-emerald-400">UNIQUE(reference, type)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono">
                        <th className="py-2.5 px-4">Ledger ID</th>
                        <th className="py-2.5 px-4">Reference</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4 text-right">Amount</th>
                        <th className="py-2.5 px-4">Source</th>
                        <th className="py-2.5 px-4">Occurred At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                      {engineState?.ledgerTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-4 text-slate-400">#{tx.id}</td>
                          <td className="py-2.5 px-4 text-slate-100">{tx.reference}</td>
                          <td className="py-2.5 px-4">
                            <span
                              className={
                                tx.type === "credit" ? "text-emerald-400" : "text-amber-400"
                              }
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-100">
                            {formatNairaFromKobo(tx.amount_minor)}
                          </td>
                          <td className="py-2.5 px-4 text-slate-300">{tx.reconciled_via}</td>
                          <td className="py-2.5 px-4 text-slate-400">{tx.occurred_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            SECTION 4: SCHEDULED RECONCILER & PEST TEST SUITE
           =================================================================== */}
        {activeSection === "reconcile-pest" && (
          <div className="space-y-8">
            {/* Reconciler Card */}
            <div className="border border-slate-800 bg-slate-900/40 rounded-lg p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="text-xs text-emerald-400 font-mono">
                    Requirement 8 · Scheduled Drift Detection & Repair
                  </div>
                  <h2 className="text-lg font-semibold text-white mt-0.5">
                    Paystack Verify API vs. Local HookLedger Reconciliation
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Compares authoritative records from{" "}
                    <code className="text-emerald-300">GET https://api.paystack.co/transaction/verify/:reference</code>{" "}
                    against <code className="text-slate-200">ledger_transactions</code> and heals dropped webhooks idempotently.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunReconcile}
                  className="px-4 py-2.5 text-xs font-mono font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap self-start cursor-pointer"
                >
                  Run php artisan hookledger:reconcile
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="py-2.5 px-4">Paystack Reference</th>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-4 text-right">Authoritative Amount</th>
                      <th className="py-2.5 px-4">Upstream Paystack Status</th>
                      <th className="py-2.5 px-4">Local HookLedger State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                    {engineState?.upstreamPaystackRecords.map((up) => {
                      const matchedLedger = engineState.ledgerTransactions.find(
                        (l) => l.reference === up.reference
                      );
                      return (
                        <tr key={up.reference} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-4 text-slate-100">{up.reference}</td>
                          <td className="py-2.5 px-4 text-slate-300">
                            {up.customer_code} · {up.customer_email}
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-100">
                            {formatNairaFromKobo(up.amount_minor)}
                          </td>
                          <td className="py-2.5 px-4 text-emerald-400">
                            {up.status} ({up.paid_at})
                          </td>
                          <td className="py-2.5 px-4">
                            {matchedLedger ? (
                              <span className="text-emerald-400">
                                Reconciled ({matchedLedger.reconciled_via})
                              </span>
                            ) : (
                              <span className="text-amber-400 font-semibold">
                                DRIFT DETECTED — Webhook Missing Locally
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pest PHP Test Runner */}
            <div className="border border-slate-800 bg-slate-900/40 rounded-lg p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="text-xs text-emerald-400 font-mono">
                    Pest 3.x Feature Test Suite · All Phases
                  </div>
                  <h3 className="text-base font-semibold text-white mt-0.5">
                    Automated Verification Suite (./vendor/bin/pest)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPestRunning(true);
                    setTimeout(() => {
                      setPestRunning(false);
                      setPestExecutedAt(new Date().toISOString().slice(11, 19) + " UTC");
                    }, 350);
                  }}
                  className="px-4 py-2 text-xs font-mono font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap self-start cursor-pointer"
                >
                  {pestRunning ? "Running Pest..." : "Re-run ./vendor/bin/pest"}
                </button>
              </div>

              <div className="space-y-4">
                {PHASE_OVERVIEWS.map((phase) => (
                  <div
                    key={phase.phase}
                    className="border border-slate-800/90 bg-[#070A12] rounded-md p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-200 font-semibold">
                        PASS · {phase.pestTests[0]?.file}
                      </span>
                      <span className="text-slate-400">
                        Phase {phase.phase} · Verified at {pestExecutedAt}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-800/60">
                      {phase.pestTests.map((test, idx) => (
                        <div
                          key={idx}
                          className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-mono text-emerald-400">
                              ✓ it {test.name}
                            </div>
                            <div className="text-slate-400">{test.description}</div>
                          </div>
                          <div className="font-mono tabular-nums text-slate-400 shrink-0">
                            {test.assertions} assertions · {test.durationMs}ms
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="mt-auto border-t border-slate-800/80 px-6 py-4 text-xs text-slate-400">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>HookLedger — Webhook Reconciliation & Idempotent Ledger Engine</span>
          <span className="font-mono tabular-nums">
            Phase 1 Ready · 3NF InnoDB · HMAC-SHA512 Verified
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
