import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ServiceIcon } from "@/components/ServiceIcon";
import { StarRating } from "@/components/StarRating";
import { getServiceById } from "@/constants/services";
import { useColors } from "@/hooks/useColors";
import { ActiveJob } from "@/types/dispatch";

interface ActiveJobCardProps {
  job: ActiveJob;
  /** When provided, shows a "Mark Complete" button. */
  onComplete?: (job: ActiveJob) => Promise<void> | void;
  /** Read-only rendering for history entries (no actions). */
  completed?: boolean;
}

function labelFor(category?: string): string {
  if (!category) return "Job";
  const service = getServiceById(category);
  if (service) return service.name;
  return (
    category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ")
  );
}

export function ActiveJobCard({
  job,
  onComplete,
  completed,
}: ActiveJobCardProps) {
  const colors = useColors();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const customerName = job.customer?.name ?? job.customerName ?? "Customer";
  const phone = job.customer?.phone;
  const pricing = job.pricing;
  const isInProgress = job.status === "in_progress";

  const call = () => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert("Can't place call", "Your device couldn't open the dialer."),
    );
  };

  // Marking complete moves the job to `pending_rating` — the global
  // RatingModal (mounted in DispatchProvider) takes over from there and is
  // mandatory, so there's nothing more to do here once this resolves.
  const handleComplete = async () => {
    if (busy || !onComplete) return;
    setBusy(true);
    try {
      await onComplete(job);
    } catch (e) {
      Alert.alert(
        "Couldn't complete job",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.96 : 1,
        },
      ]}
      onPress={() => router.push(`/job/${job.id}` as any)}
    >
      <View style={styles.headerRow}>
        <ServiceIcon serviceType={job.category ?? ""} size={46} iconSize={22} />
        <View style={styles.headerText}>
          <Text
            style={[styles.service, { color: colors.text }]}
            numberOfLines={1}
          >
            {labelFor(job.category)}
          </Text>
          {!!job.subcategory && (
            <Text
              style={[styles.sub, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {job.subcategory}
            </Text>
          )}
        </View>
        {pricing && (
          <View style={styles.priceBlock}>
            <Text style={[styles.earnLabel, { color: colors.mutedForeground }]}>
              {isInProgress ? "You earn" : "You earned"}
            </Text>
            <Text style={[styles.earnAmount, { color: colors.primary }]}>
              ₹{pricing.workerEarning}
            </Text>
          </View>
        )}
      </View>

      {pricing && (
        <Text style={[styles.feeContext, { color: colors.mutedForeground }]}>
          Job total ₹{pricing.totalPrice} · platform fee{" "}
          {pricing.platformFeePercent}% (₹{pricing.platformFee})
        </Text>
      )}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.metaRow}>
        <Feather name="user" size={13} color={colors.mutedForeground} />
        <Text
          style={[styles.meta, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {" "}
          {customerName}
        </Text>
        {job.customerRating != null && (
          <>
            <View style={[styles.sepDot, { backgroundColor: colors.mutedForeground }]} />
            <Feather name="star" size={12} color="#F59E0B" />
            <Text style={[styles.meta, { color: colors.mutedForeground, flex: 0 }]}>
              {" "}
              {job.customerRating}
            </Text>
          </>
        )}
        {completed ? (
          <View
            style={[styles.badge, { backgroundColor: colors.successLight }]}
          >
            <Feather name="check" size={12} color={colors.success} />
            <Text style={[styles.badgeText, { color: colors.success }]}>
              Done
            </Text>
          </View>
        ) : job.status === "pending_rating" ? (
          <View style={[styles.badge, { backgroundColor: colors.warningLight }]}>
            <Feather name="star" size={12} color={colors.warning} />
            <Text style={[styles.badgeText, { color: colors.warning }]}>
              Awaiting rating
            </Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              In progress
            </Text>
          </View>
        )}
      </View>
      {!!job.jobDescription && (
        <View style={styles.metaRow}>
          <Feather
            name="message-square"
            size={13}
            color={colors.mutedForeground}
          />
          <Text
            style={[styles.meta, { color: colors.mutedForeground }]}
            numberOfLines={2}
          >
            {" "}
            {job.jobDescription}
          </Text>
        </View>
      )}
      <View style={styles.metaRow}>
        <Feather name="map-pin" size={13} color={colors.mutedForeground} />
        <Text
          style={[styles.meta, { color: colors.mutedForeground }]}
          numberOfLines={2}
        >
          {" "}
          {job.address}
        </Text>
      </View>

      {completed && job.jobRating != null && (
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: colors.mutedForeground, flex: 0 }]}>
            Your rating:{" "}
          </Text>
          <StarRating rating={job.jobRating} size={13} />
        </View>
      )}

      {isInProgress && (
        <View style={styles.actions}>
          {!!phone && (
            <Pressable
              style={[styles.callBtn, { borderColor: colors.border }]}
              onPress={call}
            >
              <Feather name="phone" size={16} color={colors.text} />
              <Text style={[styles.callText, { color: colors.text }]}>
                Call
              </Text>
            </Pressable>
          )}
          {onComplete && (
            <Pressable
              style={[styles.completeBtn, { backgroundColor: colors.success }]}
              onPress={handleComplete}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check-circle" size={18} color="#fff" />
                  <Text style={styles.completeText}>Mark Complete</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerText: { flex: 1, gap: 2 },
  service: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  priceBlock: { alignItems: "flex-end" },
  earnLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  earnAmount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  feeContext: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },
  sepDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
  },
  divider: { height: 1, marginVertical: 12 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: "auto",
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  meta: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  actions: { flexDirection: "row", gap: 10, marginTop: 6 },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  callText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  completeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  completeText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
