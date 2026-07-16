import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ServiceIcon } from "@/components/ServiceIcon";
import { StarRating } from "@/components/StarRating";
import { useDispatch } from "@/context/DispatchContext";
import { getServiceById } from "@/constants/services";
import { useColors } from "@/hooks/useColors";

function labelFor(category?: string): string {
  if (!category) return "Job";
  const service = getServiceById(category);
  if (service) return service.name;
  return (
    category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ")
  );
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeJobs, history, completeJob } = useDispatch();
  const [completing, setCompleting] = useState(false);

  const job =
    activeJobs.find((j) => j.id === id) ?? history.find((j) => j.id === id);
  const service = job ? getServiceById(job.category ?? "") : null;
  const isInProgress = !!job && job.status === "in_progress";

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!job) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>
          Job not found
        </Text>
      </View>
    );
  }

  const customerName = job.customer?.name ?? job.customerName ?? "Customer";
  const phone = job.customer?.phone;
  const pricing = job.pricing;

  const call = () => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert("Can't place call", "Your device couldn't open the dialer."),
    );
  };

  // Marking complete moves the job to `pending_rating` — the global
  // RatingModal (mounted in DispatchProvider) takes over from here and is
  // mandatory, so we deliberately don't navigate away or show anything here.
  const handleComplete = async () => {
    if (completing) return;
    setCompleting(true);
    try {
      await completeJob(job.id);
    } catch (e) {
      Alert.alert(
        "Couldn't complete job",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setCompleting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.navbar,
          {
            paddingTop: topPad + 4,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>
          Job Details
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 100 },
        ]}
      >
        <View
          style={[
            styles.heroSection,
            { backgroundColor: service?.lightColor ?? colors.accent },
          ]}
        >
          <ServiceIcon
            serviceType={job.category ?? ""}
            size={60}
            iconSize={28}
          />
          <View style={styles.heroText}>
            <Text
              style={[
                styles.serviceName,
                { color: service?.color ?? colors.primary },
              ]}
            >
              {labelFor(job.category)}
            </Text>
            {!!job.subcategory && (
              <Text style={[styles.jobSub, { color: colors.mutedForeground }]}>
                {job.subcategory}
              </Text>
            )}
          </View>
          <View style={styles.statusBlock}>
            {isInProgress ? (
              <View
                style={[styles.statusBadge, { backgroundColor: colors.accent }]}
              >
                <View
                  style={[styles.dot, { backgroundColor: colors.primary }]}
                />
                <Text style={[styles.statusText, { color: colors.primary }]}>
                  In progress
                </Text>
              </View>
            ) : job.status === "pending_rating" ? (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: colors.warningLight },
                ]}
              >
                <Feather name="star" size={12} color={colors.warning} />
                <Text style={[styles.statusText, { color: colors.warning }]}>
                  Awaiting rating
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: colors.successLight },
                ]}
              >
                <Feather name="check" size={12} color={colors.success} />
                <Text style={[styles.statusText, { color: colors.success }]}>
                  Completed
                </Text>
              </View>
            )}
          </View>
        </View>

        {pricing && (
          <View
            style={[
              styles.earnBlock,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.earnRow}>
              <Text
                style={[styles.earnLabel, { color: colors.mutedForeground }]}
              >
                Job total
              </Text>
              <Text style={[styles.earnValue, { color: colors.text }]}>
                ₹{pricing.totalPrice}
              </Text>
            </View>
            <View style={styles.earnRow}>
              <Text
                style={[styles.earnLabel, { color: colors.mutedForeground }]}
              >
                Platform fee ({pricing.platformFeePercent}%)
              </Text>
              <Text
                style={[styles.earnValue, { color: colors.mutedForeground }]}
              >
                - ₹{pricing.platformFee}
              </Text>
            </View>
            <View
              style={[styles.earnDivider, { backgroundColor: colors.border }]}
            />
            <View style={styles.earnRow}>
              <Text style={[styles.earnFinalLabel, { color: colors.text }]}>
                {isInProgress ? "You'll earn" : "You earned"}
              </Text>
              <Text style={[styles.earnFinal, { color: colors.success }]}>
                ₹{pricing.workerEarning}
              </Text>
            </View>
            {job.jobRating != null && (
              <>
                <View
                  style={[
                    styles.earnDivider,
                    { backgroundColor: colors.border },
                  ]}
                />
                <View style={styles.earnRow}>
                  <Text
                    style={[styles.earnLabel, { color: colors.mutedForeground }]}
                  >
                    Your rating
                  </Text>
                  <StarRating rating={job.jobRating} size={15} />
                </View>
              </>
            )}
          </View>
        )}

        <InfoCard title="Customer" colors={colors}>
          <View style={styles.infoRow}>
            <Feather name="user" size={15} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {customerName}
            </Text>
            {job.customerRating != null && (
              <View style={styles.ratingChip}>
                <Feather name="star" size={13} color="#F59E0B" />
                <Text
                  style={[styles.ratingText, { color: colors.mutedForeground }]}
                >
                  {job.customerRating}
                </Text>
              </View>
            )}
            {isInProgress && !!phone && (
              <Pressable style={styles.callChip} onPress={call}>
                <Feather name="phone" size={13} color={colors.primary} />
                <Text style={[styles.callChipText, { color: colors.primary }]}>
                  Call
                </Text>
              </Pressable>
            )}
          </View>
        </InfoCard>

        {!!job.jobDescription && (
          <InfoCard title="Job Details" colors={colors}>
            <View style={styles.infoRow}>
              <Feather
                name="message-square"
                size={15}
                color={colors.mutedForeground}
              />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {job.jobDescription}
              </Text>
            </View>
          </InfoCard>
        )}

        <InfoCard title="Location" colors={colors}>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={15} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {job.address}
            </Text>
          </View>
          {job.distanceKm != null && (
            <View style={styles.infoRow}>
              <Feather
                name="navigation"
                size={15}
                color={colors.mutedForeground}
              />
              <Text
                style={[styles.infoMuted, { color: colors.mutedForeground }]}
              >
                {job.distanceKm.toFixed(1)} km away
              </Text>
            </View>
          )}
        </InfoCard>

        {(job.acceptedAt || job.completedAt) && (
          <InfoCard title="Timeline" colors={colors}>
            {job.acceptedAt && (
              <View style={styles.infoRow}>
                <Feather
                  name="clock"
                  size={15}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.infoMuted, { color: colors.mutedForeground }]}
                >
                  Accepted {new Date(job.acceptedAt).toLocaleString()}
                </Text>
              </View>
            )}
            {job.completedAt && (
              <View style={styles.infoRow}>
                <Feather
                  name="check-circle"
                  size={15}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.infoMuted, { color: colors.mutedForeground }]}
                >
                  Completed {new Date(job.completedAt).toLocaleString()}
                </Text>
              </View>
            )}
          </InfoCard>
        )}
      </ScrollView>

      {isInProgress && (
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
            style={[styles.fullBtn, { backgroundColor: colors.success }]}
            onPress={handleComplete}
            disabled={completing}
          >
            {completing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="check-circle" size={20} color="#fff" />
                <Text style={styles.fullBtnText}>Mark as Completed</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

function InfoCard({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.infoCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.infoCardTitle, { color: colors.mutedForeground }]}>
        {title.toUpperCase()}
      </Text>
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
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
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
  jobSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
  statusBlock: { alignItems: "flex-end" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  earnBlock: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  earnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
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
  callChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  callChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  ratingChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  actionBar: {
    padding: 16,
    borderTopWidth: 1,
  },
  fullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    padding: 14,
  },
  fullBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
