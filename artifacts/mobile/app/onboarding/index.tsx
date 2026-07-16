import { router } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { STEP_TO_ROUTE } from "@/constants/onboarding";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

/**
 * Entry point for the "onboarding" nested stack. The backend is the source of
 * truth for progress: it returns `onboardingStep` at login, and each screen
 * advances it as it saves. We resume at whichever screen that step maps to.
 */
export default function OnboardingIndex() {
  const colors = useColors();
  const { status, serverStatus, onboardingStep, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    // Anything past active onboarding lands on the tracker.
    if (status === "pending_review") {
      router.replace("/onboarding/submitted");
      return;
    }
    const route = STEP_TO_ROUTE[onboardingStep ?? "phone"] ?? "personal-details";
    router.replace(`/onboarding/${route}` as any);
  }, [isReady, status, serverStatus, onboardingStep]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
