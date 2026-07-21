import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActiveJobCard } from "@/components/ActiveJobCard";
import { OfferCard } from "@/components/OfferCard";
import { useColors } from "@/hooks/useColors";
import { useDispatch } from "@/context/DispatchContext";
import { useWorker } from "@/context/WorkerContext";
import { useAuth } from "@/context/AuthContext";
import { SERVICE_CATEGORIES } from "@/constants/services";
import { fetchEarningsSummary } from "@/services/earningsApi";
import { fetchProfile } from "@/services/profileApi";
import { JobOffer } from "@/types/dispatch";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { worker } = useWorker();
  const { fullName } = useAuth();
  const [profileName, setProfileName] = useState<string | null>(null);

  // Fetch the real name from the server if AuthContext doesn't have it yet.
  useEffect(() => {
    if (!fullName) {
      fetchProfile()
        .then((p) => setProfileName(p.fullName ?? null))
        .catch(() => {});
    }
  }, [fullName]);

  const displayName = fullName || profileName || "Worker";
  const {
    isOnline,
    offers,
    activeJobs,
    setOnline,
    acceptOffer,
    declineOffer,
    completeJob,
  } = useDispatch();
  const [toggling, setToggling] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // Refetch on every focus so it's current after e.g. completing a job on
  // another tab — walletBalance is period-independent, "week" is arbitrary.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchEarningsSummary("week")
        .then((summary) => {
          if (!cancelled) setWalletBalance(summary.walletBalance);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const handleToggleOnline = async (next: boolean) => {
    if (toggling) return;
    setToggling(true);
    try {
      await setOnline(next);
    } catch (e) {
      Alert.alert(
        "Couldn't go online",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setToggling(false);
    }
  };

  const handleAccept = async (offer: JobOffer) => {
    const res = await acceptOffer(offer.id);
    if (!res.ok) {
      Alert.alert(
        "Missed it",
        res.message ?? "This job is no longer available.",
      );
    }
  };

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
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              {getGreeting()}
            </Text>
            <Text style={[styles.workerName, { color: colors.text }]}>
              {displayName}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={[styles.iconBtn, { borderColor: colors.border }]}>
            <Feather name="bell" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 128 }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.onlineCard,
            {
              backgroundColor: isOnline
                ? colors.heroBackground
                : colors.secondary,
              shadowColor: isOnline ? colors.primary : "#000",
            },
          ]}
        >
          <View style={styles.onlineLeft}>
            <View style={styles.onlineIndicatorRow}>
              <View
                style={[
                  styles.onlineDot,
                  {
                    backgroundColor: isOnline ? colors.online : colors.offline,
                  },
                ]}
              />
              <Text
                style={[
                  styles.onlineStatus,
                  { color: isOnline ? "#fff" : colors.text },
                ]}
              >
                {isOnline ? "You're Online" : "You're Offline"}
              </Text>
            </View>
            <Text
              style={[
                styles.onlineSubtext,
                {
                  color: isOnline
                    ? "rgba(255,255,255,0.6)"
                    : colors.mutedForeground,
                },
              ]}
            >
              {isOnline
                ? `${offers.length} new request${offers.length !== 1 ? "s" : ""} near you`
                : "Go online to receive job requests"}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            disabled={toggling}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="dollar-sign" size={18} color={colors.primary} />
            {walletBalance == null ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.statValue, { color: colors.text }]}>
                ₹{walletBalance.toLocaleString("en-IN")}
              </Text>
            )}
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Wallet
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="star" size={18} color="#F59E0B" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {worker.rating}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Rating
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="check-circle" size={18} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {worker.totalJobs}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Total Jobs
            </Text>
          </View>
        </View>

        {activeJobs.length > 0 && (
          <>
            <SectionHeader title="Active Job" icon="activity" colors={colors} />
            {activeJobs.map((job) => (
              <ActiveJobCard
                key={job.id}
                job={job}
                onComplete={(j) => completeJob(j.id)}
              />
            ))}
          </>
        )}

        {isOnline && offers.length > 0 && (
          <>
            <SectionHeader
              title="New Requests"
              icon="bell"
              colors={colors}
              count={offers.length}
            />
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                onAccept={handleAccept}
                onDecline={(o) => declineOffer(o.id)}
              />
            ))}
          </>
        )}

        {isOnline && offers.length === 0 && activeJobs.length === 0 && (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="search" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Searching for jobs…
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              New requests matching your expertise will appear here
            </Text>
          </View>
        )}

        <SectionHeader title="Your Expertise" icon="settings" colors={colors} />
        <View style={styles.categoryGrid}>
          {SERVICE_CATEGORIES.map((cat) => {
            const active = worker.expertise.includes(cat.id);
            return (
              <View
                key={cat.id}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: active ? cat.lightColor : colors.secondary,
                    borderColor: active ? cat.color : colors.border,
                    borderWidth: active ? 1.5 : 1,
                  },
                ]}
              >
                <Feather
                  name={cat.icon as any}
                  size={14}
                  color={active ? cat.color : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.categoryText,
                    { color: active ? cat.color : colors.mutedForeground },
                  ]}
                >
                  {cat.name}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({
  title,
  icon,
  colors,
  count,
}: {
  title: string;
  icon: string;
  colors: any;
  count?: number;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Feather name={icon as any} size={16} color={colors.primary} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {count !== undefined && (
        <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerRight: { flexDirection: "row", gap: 8 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  greeting: { fontSize: 12, fontFamily: "Inter_400Regular" },
  workerName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { padding: 20, gap: 0 },
  onlineCard: {
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  onlineLeft: { flex: 1 },
  onlineIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  onlineStatus: { fontSize: 18, fontFamily: "Inter_700Bold" },
  onlineSubtext: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1 },
  countBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
