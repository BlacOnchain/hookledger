# HookLedger

A production-grade webhook reconciliation engine designed for high-reliability financial systems.

## Key Features

- **HMAC-SHA512 Verification**: Constant-time signature validation for secure ingestion.
- **Atomic Idempotency**: Guaranteed single-delivery processing using database-level constraints.
- **Intelligent Retries**: Exponential backoff with full jitter to prevent thundering herd scenarios.
- **Drift Detection**: Automated reconciliation between local records and upstream provider APIs.
- **Dead Letter Management**: Advanced handling for exhausted retries and forensic auditing.

## Stack

- **Runtime**: PHP 8.3 / Laravel 11
- **Database**: MySQL 8.0 (InnoDB)
- **Cache/Queue**: Redis 7.2
- **Testing**: Pest PHP
- **Infrastructure**: Docker Compose

## Quick Start

1. Clone the repository.
2. Copy `.env.example` to `.env` and configure your `PAYSTACK_SECRET_KEY`.
3. Run `docker-compose up -d`.
4. Run `php artisan migrate`.
5. Point your webhook provider to `POST /webhooks/paystack`.
