import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FooterButton } from "@/components/onboarding/FooterButton";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useColors } from "@/hooks/useColors";
import { ApiError } from "@/services/apiClient";
import { submitFaceMatch } from "@/services/onboardingApi";

type Status = "idle" | "verifying" | "success" | "failed" | "review";

const CHECKLIST = [
  { icon: "eye", text: "Remove glasses or sunglasses" },
  { icon: "sun", text: "Make sure you're in good lighting" },
  { icon: "smile", text: "Look straight at the camera" },
];

export default function FaceMatchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateData, setLastRoute } = useOnboarding();
  const { setOnboardingStep, applyServerStatus } = useAuth();

  const [status, setStatus] = useState<Status>("idle");
  const [captureUri, setCaptureUri] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const autoOpened = useRef(false);

  const proceed = () => {
    setLastRoute("work-details");
    router.push("/onboarding/work-details");
  };

  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    setCaptureUri(uri);
    setStatus("verifying");
    setErrorMsg(null);

    try {
      const res = await submitFaceMatch(uri, asset.mimeType);
      // Second-attempt soft-fail: 200 with manualReview flag.
      if (res.manualReview) {
        updateData({ faceMatchStatus: "review" });
        applyServerStatus("manual_review");
        setStatus("review");
        return;
      }
      // Success.
      updateData({ faceMatchStatus: "success" });
      if (res.onboardingStep) setOnboardingStep(res.onboardingStep);
      setStatus("success");
      setTimeout(proceed, 900);
    } catch (e) {
      // First-attempt failure comes back as ApiError 400 with retryAllowed.
      if (e instanceof ApiError && e.payload?.retryAllowed) {
        updateData({ faceMatchStatus: "failed" });
        setErrorMsg(e.message);
        setStatus("failed");
      } else {
        setErrorMsg(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
        setStatus("failed");
      }
    }
  };

  useEffect(() => {
    if (!autoOpened.current) {
      autoOpened.current = true;
      openCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OnboardingProgress step={4} total={7} title="Confirm it's really you" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {(status === "idle" || status === "failed") && (
          <>
            <View style={[styles.checklistCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {CHECKLIST.map((item) => (
                <View key={item.text} style={styles.checklistRow}>
                  <View style={[styles.checklistIcon, { backgroundColor: colors.accent }]}>
                    <Feather name={item.icon as any} size={14} color={colors.primary} />
                  </View>
                  <Text style={[styles.checklistText, { color: colors.text }]}>{item.text}</Text>
                </View>
              ))}
            </View>

            {status === "failed" && (
              <View style={[styles.warningCard, { backgroundColor: colors.warningLight }]}>
                <Feather name="alert-triangle" size={16} color={colors.warning} />
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  {errorMsg ?? "We couldn't verify your photo. Please try again in good lighting."}
                </Text>
              </View>
            )}

            <FooterButton
              label={status === "failed" ? "Retake Selfie" : "Open Camera"}
              onPress={openCamera}
            />
          </>
        )}

        {status === "verifying" && captureUri && (
          <View style={styles.centerState}>
            <Image source={{ uri: captureUri }} style={styles.selfiePreview} />
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
              Verifying your identity…
            </Text>
          </View>
        )}

        {status === "success" && captureUri && (
          <View style={styles.centerState}>
            <Image source={{ uri: captureUri }} style={styles.selfiePreview} />
            <View style={[styles.successBadge, { backgroundColor: colors.success }]}>
              <Feather name="check" size={22} color="#fff" />
            </View>
            <Text style={[styles.stateTitle, { color: colors.success }]}>Identity Verified!</Text>
          </View>
        )}

        {status === "review" && (
          <View style={styles.centerState}>
            <View style={[styles.reviewBadge, { backgroundColor: colors.secondary }]}>
              <Feather name="clock" size={26} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.text }]}>Under Manual Review</Text>
            <Text style={[styles.stateText, { color: colors.mutedForeground, textAlign: "center" }]}>
              We couldn't automatically verify your identity, so your application has been sent to
              our team for manual review. We'll notify you once it's checked.
            </Text>
            <View style={{ height: 20 }} />
            <FooterButton label="View application status" onPress={() => router.replace("/onboarding/submitted")} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, gap: 20, flexGrow: 1 },
  checklistCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 14 },
  checklistRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  checklistIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  checklistText: { fontSize: 13.5, fontFamily: "Inter_500Medium", flex: 1 },
  warningCard: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, alignItems: "flex-start" },
  warningText: { flex: 1, fontSize: 12.5, fontFamily: "Inter_500Medium", lineHeight: 18 },
  centerState: { alignItems: "center", paddingTop: 20, gap: 4 },
  selfiePreview: { width: 160, height: 160, borderRadius: 80, marginBottom: 8 },
  successBadge: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  reviewBadge: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  stateTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  stateText: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4, paddingHorizontal: 12 },
});
