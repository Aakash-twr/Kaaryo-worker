import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { useColors } from "@/hooks/useColors";

/**
 * A single invisible TextInput layered over visual digit boxes.
 * `autoComplete="sms-otp"` (Android) + `textContentType="oneTimeCode"` (iOS)
 * are native React Native props that hook into each platform's real OTP
 * autofill — no extra native module required.
 */
export function OtpInput({
  length,
  value,
  onChange,
  autoFocus,
}: {
  length: number;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  return (
    <View style={styles.wrap}>
      <View style={styles.boxRow}>
        {Array.from({ length }).map((_, i) => {
          const filled = value[i];
          const active = value.length === i;
          return (
            <View
              key={i}
              style={[
                styles.box,
                {
                  borderColor: active ? colors.primary : colors.input,
                  backgroundColor: colors.card,
                  borderWidth: active ? 2 : 1,
                },
              ]}
            >
              <Text style={[styles.boxText, { color: colors.text }]}>{filled ?? ""}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, "").slice(0, length))}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={length}
        caretHidden
        style={[StyleSheet.absoluteFillObject, styles.hiddenInput]}
        importantForAutofill="yes"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", height: 56 },
  boxRow: { flexDirection: "row", gap: 10, justifyContent: "center" },
  box: {
    width: 46,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  boxText: { fontSize: 22, fontFamily: "Inter_700Bold" },
  hiddenInput: { opacity: 0 },
});
