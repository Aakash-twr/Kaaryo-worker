import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDispatch } from "@/context/DispatchContext";
import { useColors } from "@/hooks/useColors";
import { getServiceById } from "@/constants/services";
import { ApiError } from "@/services/apiClient";
import { fetchEarningsSummary } from "@/services/earningsApi";
import { EarningsSummary } from "@/types/earnings";
import { ActiveJob } from "@/types/dispatch";

type Period = "week" | "month";

/** IST "today" as YYYY-MM-DD, to match how the backend buckets `days`. */
function todayInIst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
}

function formatTxDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default function EarningsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { history, refreshJobs } = useDispatch();

  const [period, setPeriod] = useState<Period>("week");
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const load = useCallback(async (p: Period, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchEarningsSummary(p);
      setSummary(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load earnings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period);
  }, [period, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(period, { silent: true }), refreshJobs()]);
    setRefreshing(false);
  };

  // A cancelled/expired history entry has no payout to show as a transaction.
  const recentTransactions = history
    .filter((j) => j.status === "completed")
    .slice(0, 5);

  const todayIso = todayInIst();
  const maxDay = summary ? Math.max(1, ...summary.days.map((d) => d.amount)) : 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Earnings</Text>
        <View
          style={[styles.periodToggle, { backgroundColor: colors.secondary }]}
        >
          {(["week", "month"] as Period[]).map((p) => (
            <Pressable
              key={p}
              style={[
                styles.periodBtn,
                period === p && { backgroundColor: colors.card },
              ]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[
                  styles.periodLabel,
                  {
                    color: period === p ? colors.text : colors.mutedForeground,
                  },
                ]}
              >
                {p === "week" ? "This Week" : "This Month"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 128 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {loading && !summary ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error && !summary ? (
          <View
            style={[
              styles.errorBlock,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="wifi-off" size={32} color={colors.mutedForeground} />
            <Text style={[styles.errorTitle, { color: colors.text }]}>
              Couldn't load your earnings
            </Text>
            <Text style={[styles.errorBody, { color: colors.mutedForeground }]}>
              {error}
            </Text>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => load(period)}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : summary ? (
          <>
            {error && (
              <View
                style={[
                  styles.inlineErrorBanner,
                  { backgroundColor: colors.warningLight },
                ]}
              >
                <Feather name="alert-circle" size={13} color={colors.warning} />
                <Text style={[styles.inlineErrorText, { color: colors.warning }]}>
                  {error}
                </Text>
              </View>
            )}

            <View
              style={[styles.heroCard, { backgroundColor: colors.heroBackground }]}
            >
              <Text style={styles.heroLabel}>Total Earned</Text>
              <Text style={styles.heroAmount}>
                ₹{summary.totalEarned.toLocaleString("en-IN")}
              </Text>
              <View style={styles.heroRow}>
                <View style={styles.heroStat}>
                  <Feather
                    name="briefcase"
                    size={14}
                    color="rgba(255,255,255,0.6)"
                  />
                  <Text style={styles.heroStatText}>
                    {summary.jobsCount} job{summary.jobsCount !== 1 ? "s" : ""}
                  </Text>
                </View>
                <View
                  style={[
                    styles.heroDivider,
                    { backgroundColor: "rgba(255,255,255,0.2)" },
                  ]}
                />
                <View style={styles.heroStat}>
                  <Feather
                    name="trending-up"
                    size={14}
                    color="rgba(255,255,255,0.6)"
                  />
                  <Text style={styles.heroStatText}>
                    ₹
                    {summary.jobsCount > 0
                      ? Math.round(summary.totalEarned / summary.jobsCount)
                      : 0}{" "}
                    avg/job
                  </Text>
                </View>
              </View>
            </View>

            {period === "week" && (
              <View
                style={[
                  styles.chartCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Daily Breakdown
                </Text>
                <View style={styles.barChart}>
                  {summary.days.map((d) => {
                    const pct = d.amount / maxDay;
                    const isToday = d.date === todayIso;
                    return (
                      <View key={d.date} style={styles.barColumn}>
                        <Text
                          style={[
                            styles.barAmount,
                            {
                              color: isToday
                                ? colors.primary
                                : colors.mutedForeground,
                            },
                          ]}
                        >
                          {d.amount > 0 ? `₹${(d.amount / 1000).toFixed(1)}k` : ""}
                        </Text>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${Math.max(pct * 100, 4)}%` as any,
                                backgroundColor: isToday
                                  ? colors.primary
                                  : colors.secondary,
                                borderRadius: 4,
                              },
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            styles.barDay,
                            {
                              color: isToday
                                ? colors.primary
                                : colors.mutedForeground,
                            },
                          ]}
                        >
                          {d.day}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={[styles.summaryRow, { gap: 10 }]}>
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Feather name="dollar-sign" size={18} color={colors.primary} />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  ₹{summary.walletBalance.toLocaleString("en-IN")}
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: colors.mutedForeground }]}
                >
                  Wallet Balance
                </Text>
              </View>
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Feather name="percent" size={18} color="#8B5CF6" />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {summary.platformFeePercent}%
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: colors.mutedForeground }]}
                >
                  Platform Fee
                </Text>
              </View>
            </View>

            <View
              style={[styles.withdrawCard, { backgroundColor: colors.primary }]}
            >
              <View style={styles.withdrawLeft}>
                <Text style={styles.withdrawTitle}>Available to Withdraw</Text>
                <Text style={styles.withdrawAmount}>
                  ₹{summary.walletBalance.toLocaleString("en-IN")}
                </Text>
              </View>
              <Pressable style={styles.withdrawBtn} disabled>
                <Text style={[styles.withdrawBtnText, { color: colors.primary }]}>
                  Withdraw
                </Text>
                <Text style={styles.comingSoon}>Coming soon</Text>
              </Pressable>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Transactions
            </Text>
            {recentTransactions.map((job) => (
              <TransactionRow key={job.id} job={job} colors={colors} />
            ))}

            {recentTransactions.length === 0 && (
              <View style={[styles.emptyTx, { borderColor: colors.border }]}>
                <Feather name="inbox" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No transactions yet
                </Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function TransactionRow({ job, colors }: { job: ActiveJob; colors: any }) {
  const service = getServiceById(job.category ?? "");
  const customerName = job.customer?.name ?? job.customerName ?? "Customer";
  return (
    <View style={[styles.txRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.txIcon, { backgroundColor: colors.accent }]}>
        <Feather name="arrow-down-left" size={16} color={colors.primary} />
      </View>
      <View style={styles.txInfo}>
        <Text style={[styles.txTitle, { color: colors.text }]}>
          {service?.name ?? job.category} · {customerName}
        </Text>
        <Text style={[styles.txDate, { color: colors.mutedForeground }]}>
          {formatTxDate(job.completedAt)}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color: colors.success }]}>
        +₹{job.pricing?.workerEarning ?? 0}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  periodToggle: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  periodLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  scroll: { padding: 20, gap: 0 },
  loadingBlock: { paddingTop: 64, alignItems: "center" },
  errorBlock: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  errorTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  errorBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inlineErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  inlineErrorText: { fontSize: 12.5, fontFamily: "Inter_500Medium", flex: 1 },
  heroCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  heroLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  heroAmount: {
    color: "#fff",
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  heroStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroStatText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  heroDivider: { width: 1, height: 16 },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 16,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 110,
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barAmount: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
    textAlign: "center",
  },
  barTrack: {
    width: "80%",
    height: 70,
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
  },
  barDay: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 6,
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  summaryValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  withdrawCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  withdrawLeft: { gap: 4 },
  withdrawTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  withdrawAmount: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  withdrawBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    opacity: 0.6,
  },
  withdrawBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  comingSoon: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: "#6B7280",
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: { flex: 1, gap: 3 },
  txTitle: { fontSize: 14, fontFamily: "Inter_500Medium" },
  txDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  txAmount: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyTx: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    borderStyle: "dashed",
  },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
