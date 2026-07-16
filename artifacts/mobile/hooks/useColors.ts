import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * Reads the user's chosen theme (light / dark / system) from ThemeContext
 * and resolves to the matching palette in constants/colors.ts.
 */
export function useColors() {
  const { colorScheme } = useTheme();
  const palette = colorScheme === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}

