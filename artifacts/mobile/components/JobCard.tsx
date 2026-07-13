import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { ServiceIcon } from "@/components/ServiceIcon";
import { useColors } from "@/hooks/useColors";
import { MockJob, getServiceById } from "@/constants/services";

interface JobCardProps {
  job: MockJob;
  showTimer?: boolean;
}

export function JobCard({ job, showTimer = false }: JobCardProps) {
  const colors = useColors();
  const router = useRouter();
  const service = getServiceById(job.serviceType);

  const earnAmount = job.price - job.platformFee;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
      onPress={() => router.push(`/job/${job.id}` as any)}
    >
      <View style={styles.header}>
        <ServiceIcon serviceType={job.serviceType} size={46} iconSize={22} />
        <View style={styles.headerText}>
          <Text style={[styles.serviceName, { color: colors.text }]}>{service?.name ?? job.serviceType}</Text>
          <View style={styles.row}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {" "}
              {job.scheduledDate} · {job.scheduledTime}
            </Text>
          </View>
        </View>
        <View style={styles.priceBlock}>
          <Text style={[styles.earnLabel, { color: colors.mutedForeground }]}>You earn</Text>
          <Text style={[styles.earnAmount, { color: colors.primary }]}>₹{earnAmount}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.footer}>
        <View style={styles.row}>
          <Feather name="user" size={13} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}> {job.customerName}</Text>
          <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
          <Feather name="star" size={12} color="#F59E0B" />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {" "}
            {job.customerRating}
          </Text>
        </View>
        <View style={styles.row}>
          <Feather name="map-pin" size={13} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {" "}
            {job.distance} · {job.address}
          </Text>
        </View>
      </View>

      {job.status === "pending" && (
        <View style={[styles.pendingBadge, { backgroundColor: colors.accentForeground }]}>
          <Text style={styles.pendingText}>NEW</Text>
        </View>
      )}
      {job.status === "accepted" && (
        <View style={[styles.pendingBadge, { backgroundColor: "#3B82F6" }]}>
          <Text style={styles.pendingText}>UPCOMING</Text>
        </View>
      )}
      {job.status === "active" && (
        <View style={[styles.pendingBadge, { backgroundColor: colors.success }]}>
          <Text style={styles.pendingText}>ACTIVE</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  serviceName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  priceBlock: {
    alignItems: "flex-end",
  },
  earnLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  earnAmount: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  footer: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  meta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
  },
  pendingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
