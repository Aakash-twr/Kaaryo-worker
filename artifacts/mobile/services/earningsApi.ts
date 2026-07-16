import { api } from "@/services/apiClient";
import { EarningsSummary } from "@/types/earnings";

/** GET /api/earnings/summary?period=week|month */
export const fetchEarningsSummary = (period: "week" | "month") =>
  api.get<EarningsSummary>("/api/earnings/summary", { query: { period } });
