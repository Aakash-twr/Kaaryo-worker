import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function OnboardingProgress({
  step,
  total,
  title,
  onBack,
}: {
  step: number;
  total: number;
  title: string;
  onBack?: () => void;
}) {
  const colors = useColors();
  const pct = Math.min(100, Math.round((step / total) * 100));

  return (
    <View style={styles.wrap}>
      {onBack && (
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={8}>
          <Feather name="chevron-left" size={20} color={colors.text} />
        </Pressable>
      )}
      <View style={styles.headerRow}>
        <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>
          Step {step} of {total}
        </Text>
        <Text style={[styles.pctLabel, { color: colors.primary }]}>{pct}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.secondary }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20, gap: 8 },
  backBtn: { marginBottom: 4, alignSelf: "flex-start" },
  headerRow: { flexDirection: "row", justifyContent: "space-between" },
  stepLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  pctLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 6 },
});
