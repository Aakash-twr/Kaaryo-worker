import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
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

import { ActiveJobCard } from "@/components/ActiveJobCard";
import { useDispatch } from "@/context/DispatchContext";
import { useColors } from "@/hooks/useColors";

type Tab = "active" | "completed";

export default function JobsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activeJobs, history, loadingJobs, refreshJobs, completeJob } =
    useDispatch();
  const [activeTab, setActiveTab] = useState<Tab>("active");
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshJobs();
    setRefreshing(false);
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "active", label: "Active", count: activeJobs.length },
    { id: "completed", label: "Completed", count: history.length },
  ];

  const displayJobs = activeTab === "active" ? activeJobs : history;

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
        <Text style={[styles.title, { color: colors.text }]}>My Jobs</Text>
      </View>

      <View
        style={[
          styles.tabBar,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[
                styles.tabItem,
                active && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2.5,
                },
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? colors.primary : colors.mutedForeground },
                ]}
              >
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    { backgroundColor: active ? colors.primary : colors.muted },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      { color: active ? "#fff" : colors.mutedForeground },
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
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
        {loadingJobs && displayJobs.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : displayJobs.length === 0 ? (
          <View
            style={[
              styles.empty,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather
              name="briefcase"
              size={36}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No {activeTab} jobs
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {activeTab === "active"
                ? "Accept a request to start working a job"
                : "Completed jobs will appear here"}
            </Text>
          </View>
        ) : (
          displayJobs.map((job) => (
            <ActiveJobCard
              key={job.id}
              job={job}
              completed={activeTab === "completed"}
              onComplete={
                activeTab === "active" ? (j) => completeJob(j.id) : undefined
              }
            />
          ))
        )}
      </ScrollView>
    </View>
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
  loading: { paddingTop: 48, alignItems: "center" },
  empty: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 36,
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
