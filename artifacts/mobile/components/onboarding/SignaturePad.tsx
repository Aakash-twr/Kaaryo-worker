import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { GestureResponderEvent, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

/**
 * Lightweight e-signature capture built on react-native-svg (already a
 * dependency) instead of pulling in a dedicated signature-pad package.
 * `onChange` receives the combined SVG path data, or null when empty —
 * store it as the worker's signed consent artifact.
 */
export function SignaturePad({ onChange }: { onChange: (pathData: string | null) => void }) {
  const colors = useColors();
  const [strokes, setStrokes] = useState<string[]>([]);
  const [currentStroke, setCurrentStroke] = useState("");

  const emit = (nextStrokes: string[]) => {
    onChange(nextStrokes.length ? nextStrokes.join(" ") : null);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentStroke(`M${locationX.toFixed(1)},${locationY.toFixed(1)}`);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentStroke((prev) => `${prev} L${locationX.toFixed(1)},${locationY.toFixed(1)}`);
      },
      onPanResponderRelease: () => {
        setCurrentStroke((prev) => {
          if (!prev) return prev;
          setStrokes((prevStrokes) => {
            const next = [...prevStrokes, prev];
            emit(next);
            return next;
          });
          return "";
        });
      },
    })
  ).current;

  const isEmpty = strokes.length === 0 && !currentStroke;

  const clear = () => {
    setStrokes([]);
    setCurrentStroke("");
    emit([]);
  };

  return (
    <View>
      <View
        style={[styles.pad, { borderColor: colors.border, backgroundColor: colors.background }]}
        {...panResponder.panHandlers}
      >
        {isEmpty && (
          <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>
            Sign here with your finger
          </Text>
        )}
        <Svg style={StyleSheet.absoluteFillObject}>
          {strokes.map((d, i) => (
            <Path key={i} d={d} stroke={colors.text} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          ))}
          {currentStroke ? (
            <Path d={currentStroke} stroke={colors.text} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          ) : null}
        </Svg>
      </View>
      {!isEmpty && (
        <Pressable style={styles.clearBtn} onPress={clear}>
          <Feather name="rotate-ccw" size={13} color={colors.mutedForeground} />
          <Text style={[styles.clearText, { color: colors.mutedForeground }]}>Clear signature</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    height: 160,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  placeholder: { fontSize: 13, fontFamily: "Inter_400Regular" },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end", marginTop: 10 },
  clearText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
