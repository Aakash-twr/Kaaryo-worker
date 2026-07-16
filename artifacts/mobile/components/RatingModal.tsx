import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { ActiveJob } from "@/types/dispatch";

interface RatingModalProps {
  /** The job awaiting a rating. Modal is hidden whenever this is null. */
  job: ActiveJob | null;
  submitting: boolean;
  onSubmit: (rating: number) => void | Promise<void>;
}

/**
 * Mandatory rating prompt shown once a job is marked complete. The job stays
 * in `pending_rating` server-side until a rating is submitted, so this modal
 * has no cancel/close affordance and swallows the Android back gesture —
 * there is no way to dismiss it without finishing the flow. If the app is
 * killed mid-modal, the next `/api/jobs/mine` refresh finds the job still
 * `pending_rating` and this reappears automatically (see DispatchContext).
 */
export function RatingModal({ job, submitting, onSubmit }: RatingModalProps) {
  const colors = useColors();
  const [rating, setRating] = useState(0);

  useEffect(() => {
    setRating(0);
  }, [job?.id]);

  if (!job) return null;

  const customerName = job.customer?.name ?? job.customerName ?? "Customer";
  const subtitle = [customerName, job.jobDescription].filter(Boolean).join(" · ");

  const handleSubmit = () => {
    if (rating < 1 || rating > 5) {
      Alert.alert("Rating required", "Please select 1 to 5 stars.");
      return;
    }
    onSubmit(rating);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accent }]}>
            <Feather name="star" size={26} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Rate this job
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                style={styles.starBtn}
                onPress={() => setRating(n)}
                disabled={submitting}
                hitSlop={6}
              >
                <Feather
                  name="star"
                  size={34}
                  color={n <= rating ? "#F59E0B" : colors.border}
                />
              </Pressable>
            ))}
          </View>

          {job.pricing && (
            <Text style={[styles.earning, { color: colors.success }]}>
              You earned ₹{job.pricing.workerEarning}
            </Text>
          )}

          <Pressable
            style={[
              styles.submitBtn,
              {
                backgroundColor: colors.primary,
                opacity: rating === 0 || submitting ? 0.5 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={rating === 0 || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>Submit Rating</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: "center",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 6 },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  starsRow: { flexDirection: "row", gap: 6, marginBottom: 16 },
  starBtn: { padding: 4 },
  earning: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 20 },
  submitBtn: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
