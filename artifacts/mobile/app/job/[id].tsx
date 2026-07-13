import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ServiceIcon } from "@/components/ServiceIcon";
import { useColors } from "@/hooks/useColors";
import { useWorker } from "@/context/WorkerContext";
import { getServiceById } from "@/constants/services";

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { jobs, acceptJob, rejectJob, startJob, completeJob } = useWorker();

  const job = jobs.find((j) => j.id === id);
  const service = job ? getServiceById(job.serviceType) : null;

  const [timer, setTimer] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (job?.status !== "pending") return;
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 60000,
      useNativeDriver: false,
    }).start();
    return () => clearInterval(timerRef.current!);
  }, []);

  useEffect(() => {
    if (timer === 0 && job?.status === "pending") {
      rejectJob(id!);
      router.back();
    }
  }, [timer]);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!job) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Job not found</Text>
      </View>
    );
  }

  const earned = job.price - job.platformFee;

  const handleAccept = async () => {
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    clearInterval(timerRef.current!);
    acceptJob(job.id);
    router.back();
  };

  const handleReject = async () => {
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearInterval(timerRef.current!);
    rejectJob(job.id);
    router.back();
  };

  const handleStart = async () => {
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    startJob(job.id);
  };

  const handleComplete = async () => {
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeJob(job.id);
    router.back();
  };

  const timerPercent = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.navbar,
          { paddingTop: topPad + 4, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Job Details</Text>
        <View style={{ width: 36 }} />
      </View>

      {job.status === "pending" && (
        <View style={[styles.timerBar, { backgroundColor: colors.secondary }]}>
          <Animated.View
            style={[styles.timerFill, { width: timerPercent, backgroundColor: timer > 20 ? colors.primary : colors.destructive }]}
          />
          <Text style={[styles.timerText, { color: timer > 20 ? colors.primary : colors.destructive }]}>
            Respond in {timer}s
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 100 }]}>
        <View
          style={[
            styles.heroSection,
            { backgroundColor: service?.lightColor ?? colors.accent },
          ]}
        >
          <ServiceIcon serviceType={job.serviceType} size={60} iconSize={28} />
          <View style={styles.heroText}>
            <Text style={[styles.serviceName, { color: service?.color ?? colors.primary }]}>
              {service?.name}
            </Text>
            <Text style={[styles.jobDuration, { color: colors.mutedForeground }]}>
              {job.duration} · {job.scheduledDate} at {job.scheduledTime}
            </Text>
          </View>
          <View style={styles.priceBlock}>
            <Text style={[styles.priceBig, { color: colors.text }]}>₹{job.price}</Text>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Total</Text>
          </View>
        </View>

        <View style={[styles.earnBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.earnRow}>
            <Text style={[styles.earnLabel, { color: colors.mutedForeground }]}>Job price</Text>
            <Text style={[styles.earnValue, { color: colors.text }]}>₹{job.price}</Text>
          </View>
          <View style={styles.earnRow}>
            <Text style={[styles.earnLabel, { color: colors.mutedForeground }]}>Platform fee (10%)</Text>
            <Text style={[styles.earnValue, { color: colors.mutedForeground }]}>- ₹{job.platformFee}</Text>
          </View>
          <View style={[styles.earnDivider, { backgroundColor: colors.border }]} />
          <View style={styles.earnRow}>
            <Text style={[styles.earnFinalLabel, { color: colors.text }]}>You'll earn</Text>
            <Text style={[styles.earnFinal, { color: colors.success }]}>₹{earned}</Text>
          </View>
        </View>

        <InfoCard title="Customer" colors={colors}>
          <View style={styles.infoRow}>
            <Feather name="user" size={15} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.text }]}>{job.customerName}</Text>
            <View style={styles.starRow}>
              <Feather name="star" size={13} color="#F59E0B" />
              <Text style={[styles.rating, { color: colors.text }]}>{job.customerRating}</Text>
            </View>
          </View>
        </InfoCard>

        <InfoCard title="Location" colors={colors}>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={15} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.text }]}>{job.address}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="navigation" size={15} color={colors.mutedForeground} />
            <Text style={[styles.infoMuted, { color: colors.mutedForeground }]}>
              {job.landmark} · {job.distance} away
            </Text>
          </View>
        </InfoCard>

        <InfoCard title="Job Description" colors={colors}>
          <Text style={[styles.description, { color: colors.text }]}>{job.description}</Text>
        </InfoCard>

        {job.items.length > 0 && (
          <InfoCard title="Items to Carry" colors={colors}>
            {job.items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={[styles.itemDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.itemText, { color: colors.text }]}>{item}</Text>
              </View>
            ))}
          </InfoCard>
        )}
      </ScrollView>

      {job.status === "pending" && (
        <View
          style={[
            styles.actionBar,
            {
              paddingBottom: bottomPad + 12,
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
          ]}
        >
          <Pressable
            style={[styles.rejectBtn, { borderColor: colors.destructive }]}
            onPress={handleReject}
          >
            <Feather name="x" size={20} color={colors.destructive} />
            <Text style={[styles.rejectText, { color: colors.destructive }]}>Decline</Text>
          </Pressable>
          <Pressable style={[styles.acceptBtn, { backgroundColor: colors.primary }]} onPress={handleAccept}>
            <Feather name="check" size={20} color="#fff" />
            <Text style={styles.acceptText}>Accept Job</Text>
          </Pressable>
        </View>
      )}

      {job.status === "accepted" && (
        <View
          style={[
            styles.actionBar,
            { paddingBottom: bottomPad + 12, backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          <Pressable style={[styles.fullBtn, { backgroundColor: "#3B82F6" }]} onPress={handleStart}>
            <Feather name="play" size={20} color="#fff" />
            <Text style={styles.acceptText}>Start Job</Text>
          </Pressable>
        </View>
      )}

      {job.status === "active" && (
        <View
          style={[
            styles.actionBar,
            { paddingBottom: bottomPad + 12, backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          <Pressable style={[styles.fullBtn, { backgroundColor: colors.success }]} onPress={handleComplete}>
            <Feather name="check-circle" size={20} color="#fff" />
            <Text style={styles.acceptText}>Mark as Completed</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function InfoCard({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.infoCardTitle, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
      <View style={styles.infoCardBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { fontSize: 16 },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  timerBar: {
    height: 36,
    overflow: "hidden",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  timerFill: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    opacity: 0.2,
  },
  timerText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 16, gap: 12 },
  heroSection: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 4,
  },
  heroText: { flex: 1 },
  serviceName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  jobDuration: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
  priceBlock: { alignItems: "flex-end" },
  priceBig: { fontSize: 22, fontFamily: "Inter_700Bold" },
  priceLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  earnBlock: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  earnRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  earnLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  earnValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  earnDivider: { height: 1 },
  earnFinalLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  earnFinal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  infoCardTitle: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  infoCardBody: { gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  infoMuted: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  starRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  rating: { fontSize: 13, fontFamily: "Inter_500Medium" },
  description: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemDot: { width: 6, height: 6, borderRadius: 3 },
  itemText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  actionBar: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
  },
  rejectText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  acceptBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    padding: 14,
  },
  acceptText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  fullBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    padding: 14,
  },
});
