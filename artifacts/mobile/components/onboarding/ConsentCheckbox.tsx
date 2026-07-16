import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function ConsentCheckbox({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <Pressable style={styles.row} onPress={onToggle}>
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked ? colors.primary : "transparent",
            borderColor: checked ? colors.primary : colors.border,
          },
        ]}
      >
        {checked && <Feather name="check" size={13} color="#fff" />}
      </View>
      <Text style={[styles.text, { color: colors.text }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  text: { flex: 1, fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 19 },
});
