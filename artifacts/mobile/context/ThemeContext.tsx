import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "kaaryo_theme_mode";

interface ThemeContextType {
  /** The resolved scheme actually applied ("light" or "dark"). */
  colorScheme: "light" | "dark";
  /** The user's explicit preference (light / dark / system). */
  mode: ThemeMode;
  /** Whether the context has finished restoring the persisted preference. */
  isReady: boolean;
  /** Switch theme mode and persist the choice. */
  setMode: (mode: ThemeMode) => void;
  /** Convenience: cycle between light and dark (ignores system). */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

/**
 * Provides a user-controllable light/dark mode that persists via AsyncStorage.
 *
 * Wrap this around your root layout so every screen can read
 * `useTheme()` or—indirectly—`useColors()`.
 *
 * The `systemScheme` prop should be the value from React Native's
 * `useColorScheme()` so we can resolve "system" mode correctly.
 */
export function ThemeProvider({
  systemScheme,
  children,
}: {
  systemScheme: "light" | "dark" | null | undefined;
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [isReady, setIsReady] = useState(false);

  // Bootstrap: restore persisted preference.
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
          setModeState(stored);
        }
      } catch {}
      setIsReady(true);
    })();
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const colorScheme: "light" | "dark" =
    mode === "system" ? (systemScheme ?? "light") : mode;

  return (
    <ThemeContext.Provider value={{ colorScheme, mode, isReady, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
