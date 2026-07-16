# Earnings Page — Backend Integration Guide

The worker app's **Earnings** tab ([artifacts/mobile/app/(tabs)/earnings.tsx](artifacts/mobile/app/(tabs)/earnings.tsx)) is currently wired to local mock data (`EARNINGS_DATA` in `constants/services.ts` and a fake AsyncStorage-backed `balance` in `WorkerContext`). This doc specifies the one new endpoint needed to replace that mock data with real values, plus how to reuse an endpoint that already exists.

Base URL / auth / envelope conventions match the rest of the API you've already built (Bearer token via `Authorization` header, JSON body, `{ "success": false, "message": "..." }` on error) — nothing new there.

## What's on the page

| UI element | Value shown | Data needed |
|---|---|---|
| Period toggle | "This Week" / "This Month" | client-side only |
| Hero card | Total Earned, jobs count, avg/job | **new** — total + count for the selected period (avg is computed client-side) |
| Daily Breakdown chart (week view only) | 7 bars, Mon–Sun | **new** — per-day totals for the current calendar week |
| Wallet Balance | ₹ amount | **new** — running payout balance |
| Platform Fee card | e.g. "10%" | **new** — currently hardcoded, needs a real value |
| Available to Withdraw | same as Wallet Balance | reuses Wallet Balance |
| Withdraw button | — | **out of scope** — currently a no-op in the UI, see note at the bottom |
| Recent Transactions (last 5) | service, customer, date, amount earned | **no new endpoint** — reuse `GET /api/jobs/mine`'s `history` |

Only **one new endpoint** is required. Everything else either reuses `GET /api/jobs/mine` (from the job dispatch integration) or is computed on the client.

## New endpoint: `GET /api/earnings/summary`

```
GET /api/earnings/summary?period=week|month
Authorization: Bearer <token>
```

### Response

```json
{
  "success": true,
  "period": "week",
  "currency": "INR",
  "totalEarned": 6840,
  "jobsCount": 11,
  "walletBalance": 3240,
  "platformFeePercent": 10,
  "days": [
    { "date": "2026-07-13", "day": "Mon", "amount": 849 },
    { "date": "2026-07-14", "day": "Tue", "amount": 1248 },
    { "date": "2026-07-15", "day": "Wed", "amount": 699 },
    { "date": "2026-07-16", "day": "Thu", "amount": 1099 },
    { "date": "2026-07-17", "day": "Fri", "amount": 0 },
    { "date": "2026-07-18", "day": "Sat", "amount": 0 },
    { "date": "2026-07-19", "day": "Sun", "amount": 0 }
  ]
}
```

### Fields

| Field | Type | Meaning |
|---|---|---|
| `period` | `"week" \| "month"` | Echoes the query param, for sanity-checking on the client. |
| `currency` | string | Same convention as `JobPricing.currency` elsewhere in the app. |
| `totalEarned` | number | Sum of `pricing.workerEarning` across jobs **completed** in the requested period. → Hero card's "Total Earned". |
| `jobsCount` | number | Count of jobs completed in the requested period. → Hero card's "N jobs". Avg/job is `totalEarned / jobsCount`, computed client-side — don't send it separately. Note this can legitimately be `0` for a worker with no completed jobs yet in the period. |
| `walletBalance` | number | The worker's current available payout balance (lifetime earnings not yet withdrawn). **Independent of `period`** — always the same value regardless of which period was requested. → "Wallet Balance" and "Available to Withdraw" cards (same number, two labels). |
| `platformFeePercent` | number | The platform's **current** effective commission rate (see note below). → "Platform Fee" card. |
| `days` | array of 7 | **Always the current calendar week (Mon → Sun), regardless of `period`.** The frontend only renders this when `period=week`, but don't bother varying it by the query param — it's cheaper for you to always compute "this week" and let the client ignore it for the month view. |

### Business rules — please follow these exactly, they're the parts most likely to cause a subtly-wrong-looking chart or total otherwise

1. **Bucket by `completedAt`, not `createdAt` or `acceptedAt`.** A job counts toward the period it was *finished* in — that's when the worker actually earned the money. (The current mock code in `WorkerContext.tsx` buckets by `createdAt`, which is a bug — please don't carry that forward.)
2. **Only jobs with `status === "completed"` count.** A job sitting in `pending_rating` hasn't finished the rating-required flow yet (see the rating system doc) — exclude it from `totalEarned`/`jobsCount` until the worker submits the rating and it flips to `completed`.
3. **"Week" = the ISO calendar week containing today (Monday–Sunday), not a rolling 7-day window.** This matches the `days` array's fixed Mon–Sun labels. A rolling window would make the chart's day labels lie.
4. **"Month" = the calendar month containing today (1st → today), not a rolling 30-day window.**
5. **Do all date-bucketing in `Asia/Kolkata` (IST), not server UTC or whatever the request's timezone header claims.** All workers and customers are India-based; bucketing in UTC would shift a job completed at 11:30pm IST into the wrong day/week for anyone who did a late job.
6. **Zero-fill missing days.** If a worker did no jobs on a given day (including future days in the current week, e.g. "hasn't happened yet"), that day's `amount` is `0`, not omitted — the frontend expects exactly 7 entries in order.

### `platformFeePercent` — which number is this?

Since `JobPricing.platformFeePercent` is stored per-job (and could in principle change over time as a config value), there's a choice here:

- **Recommended:** return the platform's *current* rate (whatever a brand-new job would get today), e.g. read from your commission-rate config. This answers "what am I paying right now," which is what a worker actually wants to know from a settings-style card.
- **Not recommended:** a blended average of `platformFeePercent` across the period's jobs. It's more work to compute and would show a confusing number (e.g. "9.6%") if the rate has ever changed, without actually telling the worker anything actionable.

Go with the current-rate approach unless there's a reason we haven't discussed.

## Recent Transactions — no new endpoint

The "Recent Transactions" list (last 5 completed jobs, with service + customer name, date, and `+₹{amount}`) is already fully covered by the existing `GET /api/jobs/mine` → `history` array from the job dispatch integration. Every field it needs is already there:

- `category` / `subcategory` → service name
- `customer.name` → customer name
- `completedAt` → date/time (the frontend will format this; no need for a separate scheduled date/time field like the old mock had)
- `pricing.workerEarning` → the `+₹` amount

**One requirement on that existing endpoint:** please make sure `history` is sorted **newest-first by `completedAt`**. The Earnings page just takes the first 5 entries — if it's unsorted (or sorted oldest-first), "Recent Transactions" will show old jobs instead of recent ones. If it's not already sorted that way, that's a small fix to `/api/jobs/mine`, not a new endpoint.

## Out of scope for this doc: the Withdraw button

The "Withdraw" button on the page is currently a dead `Pressable` with no `onPress` — it doesn't do anything yet in the frontend either. Building a real withdrawal flow (payout method, minimum balance, processing state, `POST /api/earnings/withdraw` or similar) is a separate piece of work with its own set of questions (payout rails, KYC, holds, etc.) — flagging it here so it's not forgotten, but it's not part of this doc. This doc only covers **displaying real values**, not moving money.

## Quick summary for implementation

- [ ] `GET /api/earnings/summary?period=week|month` — new endpoint, shape above.
- [ ] Bucket by `completedAt`, IST timezone, calendar week/month (not rolling windows).
- [ ] Only `status === "completed"` jobs count toward totals.
- [ ] `walletBalance` and `platformFeePercent` are period-independent fields on the same response.
- [ ] `days` is always the current Mon–Sun week, zero-filled, regardless of `period`.
- [ ] Confirm/fix `GET /api/jobs/mine`'s `history` sort order (newest-first by `completedAt`) — no new endpoint needed for Recent Transactions.
- [ ] Withdraw is out of scope for now.
