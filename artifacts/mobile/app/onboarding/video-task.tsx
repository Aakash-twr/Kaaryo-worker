import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FooterButton } from "@/components/onboarding/FooterButton";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import {
  DURATION_HINT,
  INSTRUCTIONS_MIN_READ_SECONDS,
  tasksForRole,
  VIDEO_TIPS,
} from "@/constants/videoTask";
import { useOnboarding } from "@/context/OnboardingContext";
import { useColors } from "@/hooks/useColors";
import { useCountdown } from "@/hooks/useCountdown";

/**
 * Step 6a — practical task instructions. The worker reads what to record here,
 * then leaves the app to record with their phone camera, and comes back to the
 * upload screen. A short read timer keeps them from skipping straight past.
 */
export default function VideoTaskScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, setLastRoute } = useOnboarding();

  const tasks = tasksForRole(data.role);
  const { remaining, start, isActive } = useCountdown(INSTRUCTIONS_MIN_READ_SECONDS);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    start();
    setStarted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locked = !started || isActive;

  const proceed = () => {
    setLastRoute("video-upload");
    router.push("/onboarding/video-upload" as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OnboardingProgress
        step={6}
        total={8}
        title="Show us your skills"
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          Record two short videos of yourself doing these tasks, then upload them on the next screen.
          This helps us confirm your hands-on skills.
        </Text>

        {tasks.map((task) => (
          <View
            key={task.number}
            style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.taskHeader}>
              <View style={[styles.taskBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.taskBadgeText, { color: colors.secondaryForeground }]}>
                  Task {task.number}
                </Text>
              </View>
              <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
            </View>
            <Text style={[styles.taskDesc, { color: colors.mutedForeground }]}>
              {task.description}
            </Text>
            <View style={styles.durationRow}>
              <Feather name="clock" size={13} color={colors.primary} />
              <Text style={[styles.durationText, { color: colors.primary }]}>{DURATION_HINT}</Text>
            </View>
          </View>
        ))}

        <View style={[styles.tipsCard, { backgroundColor: colors.accent }]}>
          <Text style={[styles.tipsTitle, { color: colors.text }]}>Tips for a good video</Text>
          {VIDEO_TIPS.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <Feather name="check" size={14} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={[styles.tipText, { color: colors.text }]}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <FooterButton
          label={
            locked
              ? `Please read the tasks… ${started ? remaining : INSTRUCTIONS_MIN_READ_SECONDS}s`
              : "I have recorded my videos, proceed to upload"
          }
          onPress={proceed}
          disabled={locked}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingBottom: 40, gap: 16 },
  intro: { fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 20 },
  taskCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  taskHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  taskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  taskBadgeText: { fontSize: 11.5, fontFamily: "Inter_700Bold" },
  taskTitle: { fontSize: 15.5, fontFamily: "Inter_700Bold", flex: 1 },
  taskDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  durationText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tipsCard: { borderRadius: 16, padding: 16, gap: 10, marginTop: 4 },
  tipsTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  tipRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  tipText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 19 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
