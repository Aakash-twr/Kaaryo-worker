import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function SelectChip({
  label,
  sub,
  selected,
  onPress,
  icon,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
  icon?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accent : colors.card,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 1.5 : 1,
        },
      ]}
    >
      {icon && (
        <Feather name={icon as any} size={14} color={selected ? colors.primary : colors.mutedForeground} />
      )}
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: selected ? colors.primary : colors.text }]}>{label}</Text>
        {sub && (
          <Text style={[styles.sub, { color: selected ? colors.primary : colors.mutedForeground }]}>
            {sub}
          </Text>
        )}
      </View>
      {selected && <Feather name="check" size={14} color={colors.primary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  textWrap: { flex: 1 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
});
