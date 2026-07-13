import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { JobCard } from "@/components/JobCard";
import { ServiceIcon } from "@/components/ServiceIcon";
import { useColors } from "@/hooks/useColors";
import { useWorker } from "@/context/WorkerContext";
import { getServiceById } from "@/constants/services";

type Tab = "upcoming" | "active" | "completed";

export default function JobsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeJobs, upcomingJobs, completedJobs } = useWorker();
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "upcoming", label: "Upcoming", count: upcomingJobs.length },
    { id: "active", label: "Active", count: activeJobs.length },
    { id: "completed", label: "Completed", count: completedJobs.length },
  ];

  const displayJobs =
    activeTab === "upcoming"
      ? upcomingJobs
      : activeTab === "active"
      ? activeJobs
      : completedJobs;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>My Jobs</Text>
      </View>

      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[
                styles.tabItem,
                active && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 },
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.mutedForeground }]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    { backgroundColor: active ? colors.primary : colors.muted },
                  ]}
                >
                  <Text style={[styles.tabBadgeText, { color: active ? "#fff" : colors.mutedForeground }]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "web" ? 100 : 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {displayJobs.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="briefcase" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No {activeTab} jobs</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {activeTab === "upcoming"
                ? "Accept new requests to see them here"
                : activeTab === "active"
                ? "Start an upcoming job to see it here"
                : "Completed jobs will appear here"}
            </Text>
          </View>
        ) : (
          displayJobs.map((job) =>
            activeTab === "completed" ? (
              <CompletedJobCard key={job.id} job={job} colors={colors} onPress={() => router.push(`/job/${job.id}` as any)} />
            ) : (
              <JobCard key={job.id} job={job} />
            )
          )
        )}
      </ScrollView>
    </View>
  );
}

function CompletedJobCard({ job, colors, onPress }: { job: any; colors: any; onPress: () => void }) {
  const service = getServiceById(job.serviceType);
  const earned = job.price - job.platformFee;

  return (
    <Pressable
      style={[styles.completedCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.completedRow}>
        <ServiceIcon serviceType={job.serviceType} size={44} iconSize={20} />
        <View style={styles.completedInfo}>
          <Text style={[styles.completedService, { color: colors.text }]}>{service?.name}</Text>
          <Text style={[styles.completedDate, { color: colors.mutedForeground }]}>
            {job.scheduledDate} · {job.scheduledTime}
          </Text>
          <Text style={[styles.completedCustomer, { color: colors.mutedForeground }]}>
            {job.customerName}
          </Text>
        </View>
        <View style={styles.completedRight}>
          <Text style={[styles.completedEarned, { color: colors.success }]}>+₹{earned}</Text>
          {job.workerRating && (
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Feather
                  key={s}
                  name="star"
                  size={12}
                  color={s <= job.workerRating ? "#F59E0B" : colors.border}
                />
              ))}
            </View>
          )}
        </View>
      </View>
      {job.customerReview && (
        <View style={[styles.reviewBox, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.reviewText, { color: colors.mutedForeground }]} numberOfLines={2}>
            "{job.customerReview}"
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 6,
  },
  tabLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 20, gap: 0 },
  empty: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 36,
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  completedCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  completedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  completedInfo: { flex: 1, gap: 3 },
  completedService: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  completedDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  completedCustomer: { fontSize: 12, fontFamily: "Inter_400Regular" },
  completedRight: { alignItems: "flex-end", gap: 6 },
  completedEarned: { fontSize: 16, fontFamily: "Inter_700Bold" },
  ratingRow: { flexDirection: "row", gap: 2 },
  reviewBox: {
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  reviewText: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
});
