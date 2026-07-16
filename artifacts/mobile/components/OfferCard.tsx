import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ServiceIcon } from "@/components/ServiceIcon";
import { getServiceById } from "@/constants/services";
import { useColors } from "@/hooks/useColors";
import { useCountdown } from "@/hooks/useCountdown";
import { JobOffer } from "@/types/dispatch";

/**
 * Visual urgency window for a fresh offer. This is a UI affordance only — the
 * server remains authoritative and removes the card via `job:expired`, so the
 * timer never removes the offer itself (it just conveys "act fast").
 */
const OFFER_WINDOW_SECONDS = 60;

interface OfferCardProps {
  offer: JobOffer;
  onAccept: (offer: JobOffer) => Promise<void> | void;
  onDecline: (offer: JobOffer) => Promise<void> | void;
}

function labelFor(category: string): string {
  const service = getServiceById(category);
  if (service) return service.name;
  return (
    category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ")
  );
}

export function OfferCard({ offer, onAccept, onDecline }: OfferCardProps) {
  const colors = useColors();
  const { remaining, start } = useCountdown(OFFER_WINDOW_SECONDS);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);

  useEffect(() => {
    start(OFFER_WINDOW_SECONDS);
  }, [start]);

  const handle = async (action: "accept" | "decline") => {
    if (busy) return;
    setBusy(action);
    try {
      await (action === "accept" ? onAccept(offer) : onDecline(offer));
    } finally {
      setBusy(null);
    }
  };

  const urgent = remaining > 0 && remaining <= 15;
  const timerColor = urgent ? colors.destructive : colors.primary;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.primary },
      ]}
    >
      <View style={[styles.ribbon, { backgroundColor: colors.primary }]}>
        <View style={styles.ribbonLeft}>
          <View style={styles.liveDot} />
          <Text style={styles.ribbonText}>NEW REQUEST</Text>
        </View>
        {remaining > 0 && (
          <View style={styles.ribbonTimer}>
            <Feather name="clock" size={11} color="#fff" />
            <Text style={styles.ribbonTimerText}>{remaining}s</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <ServiceIcon serviceType={offer.category} size={46} iconSize={22} />
          <View style={styles.headerText}>
            <Text
              style={[styles.service, { color: colors.text }]}
              numberOfLines={1}
            >
              {labelFor(offer.category)}
            </Text>
            {!!offer.subcategory && (
              <Text
                style={[styles.sub, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {offer.subcategory}
              </Text>
            )}
          </View>
          <View style={styles.distanceBlock}>
            <Text style={[styles.distance, { color: timerColor }]}>
              {offer.distanceKm.toFixed(1)} km
            </Text>
            <Text
              style={[styles.distanceLabel, { color: colors.mutedForeground }]}
            >
              away
            </Text>
          </View>
        </View>

        <View
          style={[styles.earnBlock, { backgroundColor: colors.accent }]}
        >
          <Text style={[styles.earnAmount, { color: colors.primary }]}>
            You'll earn ₹{offer.pricing.workerEarning}
          </Text>
          <Text
            style={[styles.earnDetail, { color: colors.mutedForeground }]}
          >
            Job total ₹{offer.pricing.totalPrice} · platform fee{" "}
            {offer.pricing.platformFeePercent}% (₹{offer.pricing.platformFee})
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Feather name="user" size={13} color={colors.mutedForeground} />
          <Text
            style={[styles.meta, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {" "}
            {offer.customerName}
          </Text>
          <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
          <Feather name="star" size={12} color="#F59E0B" />
          <Text style={[styles.meta, { color: colors.mutedForeground, flex: 0 }]}>
            {" "}
            {offer.customerRating}
          </Text>
        </View>
        {!!offer.jobDescription && (
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
              {offer.jobDescription}
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
            {offer.address}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.declineBtn, { borderColor: colors.border }]}
            onPress={() => handle("decline")}
            disabled={!!busy}
          >
            {busy === "decline" ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Text
                style={[styles.declineText, { color: colors.mutedForeground }]}
              >
                Decline
              </Text>
            )}
          </Pressable>
          <Pressable
            style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
            onPress={() => handle("accept")}
            disabled={!!busy}
          >
            {busy === "accept" ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="check" size={18} color="#fff" />
                <Text style={styles.acceptText}>Accept</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  ribbon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ribbonLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#fff" },
  ribbonText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  ribbonTimer: { flexDirection: "row", alignItems: "center", gap: 4 },
  ribbonTimerText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  body: { padding: 16, gap: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerText: { flex: 1, gap: 2 },
  service: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  distanceBlock: { alignItems: "flex-end" },
  distance: { fontSize: 16, fontFamily: "Inter_700Bold" },
  distanceLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  earnBlock: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  earnAmount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  earnDetail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  metaRow: { flexDirection: "row", alignItems: "center" },
  meta: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  declineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
  },
  declineText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  acceptBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  acceptText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
