/** One bar in the "This Week" chart. `date` is IST-bucketed, "YYYY-MM-DD". */
export interface EarningsDay {
  date: string;
  day: string; // "Mon".."Sun"
  amount: number;
}

/**
 * Response of `GET /api/earnings/summary`. `walletBalance` and
 * `platformFeePercent` are period-independent — same value regardless of
 * which `period` was requested. `days` is always the current Mon→Sun week,
 * even when `period` is "month" (the screen just doesn't render it then).
 */
export interface EarningsSummary {
  period: "week" | "month";
  currency: string;
  totalEarned: number;
  jobsCount: number;
  walletBalance: number;
  platformFeePercent: number;
  days: EarningsDay[];
}
