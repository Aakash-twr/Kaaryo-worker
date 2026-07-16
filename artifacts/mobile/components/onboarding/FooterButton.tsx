import React from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from "react-native";

import { useColors } from "@/hooks/useColors";

export function FooterButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const colors = useColors();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={[styles.btn, { backgroundColor: colors.primary, opacity: isDisabled ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  label: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
