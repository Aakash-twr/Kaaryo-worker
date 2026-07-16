import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Feather } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DispatchProvider } from "@/context/DispatchContext";
import { OnboardingProvider, useOnboarding } from "@/context/OnboardingContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { WorkerProvider } from "@/context/WorkerContext";
import { useColors } from "@/hooks/useColors";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/**
 * Dev-only escape hatch: wipes every mock account, session, and onboarding
 * draft in one tap so testers can restart the whole flow from Screen 1,
 * no matter which guarded screen they're currently stuck on.
 */
function DevResetButton() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { hardReset } = useAuth();
  const { reset: resetOnboarding } = useOnboarding();
  const [resetting, setResetting] = useState(false);

  const handleReset = () => {
    Alert.alert(
      "Reset test data?",
      "This clears every mock account and onboarding draft on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setResetting(true);
            resetOnboarding();
            await hardReset();
            setResetting(false);
          },
        },
      ],
    );
  };

  return (
    <Pressable
      onPress={handleReset}
      disabled={resetting}
      style={[
        styles.devBtn,
        {
          top: insets.top + 6,
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Feather name="refresh-ccw" size={12} color={colors.mutedForeground} />
      <Text style={[styles.devBtnText, { color: colors.mutedForeground }]}>
        Reset test data
      </Text>
    </Pressable>
  );
}

function RootLayoutNav() {
  const { status, isReady } = useAuth();

  if (!isReady) return null;

  return (
    <>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Protected guard={status === "logged_out"}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected
          guard={status === "onboarding" || status === "pending_review"}
        >
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={status === "active"}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      {/* Once logged in, the same reset lives in the Profile tab instead of floating over every screen. */}
      {__DEV__ && status !== "active" && <DevResetButton />}
    </>
  );
}

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider systemScheme={systemScheme}>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <OnboardingProvider>
                <WorkerProvider>
                  <DispatchProvider>
                    <GestureHandlerRootView>
                      <KeyboardProvider>
                        <RootLayoutNav />
                      </KeyboardProvider>
                    </GestureHandlerRootView>
                  </DispatchProvider>
                </WorkerProvider>
              </OnboardingProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  devBtn: {
    position: "absolute",
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    opacity: 0.85,
  },
  devBtnText: { fontSize: 10.5, fontFamily: "Inter_500Medium" },
});
