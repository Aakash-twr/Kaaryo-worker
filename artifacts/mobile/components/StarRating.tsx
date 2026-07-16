import React from "react";
import { Text, TextStyle } from "react-native";

interface StarRatingProps {
  /** 1-5. Rounded and clamped defensively. */
  rating: number;
  size?: number;
  filledColor?: string;
  emptyColor?: string;
}

/** Renders a fixed 5-star glyph row with `rating` of them filled. */
export function StarRating({
  rating,
  size = 14,
  filledColor = "#F59E0B",
  emptyColor = "#CBD5E1",
}: StarRatingProps) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  const base: TextStyle = { fontSize: size };

  return (
    <Text style={base}>
      <Text style={{ color: filledColor }}>{"★".repeat(filled)}</Text>
      <Text style={{ color: emptyColor }}>{"☆".repeat(5 - filled)}</Text>
    </Text>
  );
}
