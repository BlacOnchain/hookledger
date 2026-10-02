# HookLedger

Production-grade webhook reconciliation engine for financial systems.

## Architecture

```mermaid
graph TD
    P[Paystack] -->|POST| H[HookLedger API]
    H -->|Validate Signature| I[Idempotent Ingestion]
    I -->|Store Raw| DB[(MySQL 8.0)]
    I -->|Dispatch| Q[Redis Queue]
    Q -->|Process| J[Worker Job]
    J -->|Row Lock| DB
    J -->|Success| L[Ledger Entry]
    J -->|Fail| R[Exponential Backoff]
    R -->|Exhausted| DLQ[Dead Letter Queue]
    S[Scheduler] -->|15m| RC[Reconciler]
    RC -->|Fetch Missing| P
    RC -->|Repair| I
```

## ADRs

### ADR 001: Idempotency Strategy
**Decision:** Use a composite unique constraint on `(provider, event_id)` and a status guard.
**Rationale:** Database-level constraints are the final source of truth. Application-level checks are prone to race conditions unless using pessimistic locking.

### ADR 002: Retry Strategy
**Decision:** Exponential backoff with full jitter (max 5 tries).
**Rationale:** Prevents thundering herds after a downstream recovery. Jitter spreads out requests across the backoff window.

### ADR 003: Why a Queue?
**Decision:** Immediate 200 OK responses with background processing.
**Rationale:** Webhook providers have short timeouts. Decoupling ingestion from execution ensures we don't lose data if the internal processing logic is slow.

## Benchmarks

| Metric | Target |
| :--- | :--- |
| Ingestion Latency (p95) | < 15ms |
| Max Throughput | 2,500 req/s |
| Duplicate Handling Error Rate | 0.00% |
