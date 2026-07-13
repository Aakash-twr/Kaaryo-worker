import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useWorker } from "@/context/WorkerContext";
import { SERVICE_CATEGORIES } from "@/constants/services";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { worker, toggleExpertise } = useWorker();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleToggle = async (categoryId: string) => {
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleExpertise(categoryId);
  };

  const settings = [
    { icon: "map-pin", label: "Service Area", value: worker.city },
    { icon: "phone", label: "Phone", value: worker.phone },
    { icon: "help-circle", label: "Help & Support", value: "" },
    { icon: "file-text", label: "Terms & Privacy", value: "" },
    { icon: "star", label: "Rate the App", value: "" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        <Pressable style={[styles.editBtn, { borderColor: colors.border }]}>
          <Feather name="edit-2" size={16} color={colors.text} />
          <Text style={[styles.editLabel, { color: colors.text }]}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "web" ? 100 : 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatarLarge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.avatarLargeText, { color: colors.primary }]}>
              {worker.name.charAt(0)}
            </Text>
          </View>
          <Text style={[styles.workerName, { color: colors.text }]}>{worker.name}</Text>
          <Text style={[styles.workerCity, { color: colors.mutedForeground }]}>{worker.city}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Feather name="star" size={13} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>{worker.rating} Rating</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.successLight }]}>
              <Feather name="check-circle" size={13} color={colors.success} />
              <Text style={[styles.badgeText, { color: colors.success }]}>{worker.totalJobs} Jobs Done</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>My Expertise</Text>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
          Toggle the services you offer. You'll only receive requests for active services.
        </Text>
        <View style={styles.expertiseGrid}>
          {SERVICE_CATEGORIES.map((cat) => {
            const active = worker.expertise.includes(cat.id);
            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.expertiseCard,
                  {
                    backgroundColor: active ? cat.lightColor : colors.card,
                    borderColor: active ? cat.color : colors.border,
                    borderWidth: active ? 1.5 : 1,
                  },
                ]}
                onPress={() => handleToggle(cat.id)}
              >
                <View
                  style={[
                    styles.expertiseIconWrap,
                    { backgroundColor: active ? cat.color : colors.secondary },
                  ]}
                >
                  <Feather
                    name={cat.icon as any}
                    size={18}
                    color={active ? "#fff" : colors.mutedForeground}
                  />
                </View>
                <Text
                  style={[
                    styles.expertiseName,
                    { color: active ? cat.color : colors.text },
                  ]}
                >
                  {cat.name}
                </Text>
                <View
                  style={[
                    styles.expertiseCheck,
                    {
                      backgroundColor: active ? cat.color : colors.secondary,
                    },
                  ]}
                >
                  <Feather name={active ? "check" : "plus"} size={12} color={active ? "#fff" : colors.mutedForeground} />
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {settings.map((item, i) => (
            <Pressable
              key={item.label}
              style={[
                styles.settingsRow,
                i < settings.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={[styles.settingsIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={item.icon as any} size={16} color={colors.text} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>{item.label}</Text>
              {item.value ? (
                <Text style={[styles.settingsValue, { color: colors.mutedForeground }]}>{item.value}</Text>
              ) : null}
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>

        <Pressable style={[styles.logoutBtn, { borderColor: colors.destructive }]}>
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Log Out</Text>
        </Pressable>
      </ScrollView>
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
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  scroll: { padding: 20, gap: 0 },
  profileCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  avatarLargeText: { fontSize: 30, fontFamily: "Inter_700Bold" },
  workerName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  workerCity: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 8 },
  badgeRow: { flexDirection: "row", gap: 10 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 14 },
  expertiseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  expertiseCard: {
    width: "47%",
    borderRadius: 14,
    padding: 14,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  expertiseIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  expertiseName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  expertiseCheck: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  settingsIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  settingsValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
