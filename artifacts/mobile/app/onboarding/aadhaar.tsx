import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FooterButton } from "@/components/onboarding/FooterButton";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { OtpInput } from "@/components/onboarding/OtpInput";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useColors } from "@/hooks/useColors";
import { useCountdown } from "@/hooks/useCountdown";
import { ApiError } from "@/services/apiClient";
import { requestAadhaarOtp, verifyAadhaarOtp } from "@/services/onboardingApi";
import { formatDob } from "@/utils/date";

type Phase = "number" | "otp" | "confirm";

export default function AadhaarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateData, setLastRoute } = useOnboarding();
  const { setOnboardingStep } = useAuth();

  const [phase, setPhase] = useState<Phase>(data.aadhaarVerified ? "confirm" : "number");
  const [aadhaarNumber, setAadhaarNumber] = useState(data.aadhaarNumber);
  const [differentMobile, setDifferentMobile] = useState(false);
  const [otp, setOtp] = useState("");
  const [refId, setRefId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedName, setVerifiedName] = useState(data.aadhaarName);
  const [verifiedDob, setVerifiedDob] = useState(data.aadhaarDob);
  const [mobileMismatch, setMobileMismatch] = useState(false);
  const [nextStep, setNextStep] = useState<string | null>(null);
  const resend = useCountdown(30);

  const canSendOtp = aadhaarNumber.length === 12;

  const handleSendOtp = async () => {
    if (!canSendOtp) return;
    setSending(true);
    setError(null);
    try {
      const res = await requestAadhaarOtp(aadhaarNumber);
      setRefId(res.refId);
      setPhase("otp");
      setOtp("");
      resend.start();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't send OTP. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    if (resend.isActive) return;
    setOtp("");
    setError(null);
    try {
      const res = await requestAadhaarOtp(aadhaarNumber);
      setRefId(res.refId);
      resend.start();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't resend OTP. Please try again.");
    }
  };

  const handleVerify = async (code: string) => {
    setVerifying(true);
    setError(null);
    try {
      const res = await verifyAadhaarOtp(aadhaarNumber, code, refId ?? undefined);
      setVerifiedName(res.confirmDetails.name);
      setVerifiedDob(res.confirmDetails.dob);
      setMobileMismatch(res.mobileMismatch);
      setNextStep(res.onboardingStep);
      setPhase("confirm");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "We couldn't verify that OTP. Please try again.");
      setOtp("");
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirm = () => {
    updateData({
      aadhaarNumber,
      aadhaarVerified: true,
      aadhaarName: verifiedName,
      aadhaarDob: verifiedDob,
    });
    if (nextStep) setOnboardingStep(nextStep);
    setLastRoute("face-match");
    router.push("/onboarding/face-match");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OnboardingProgress step={3} total={8} title="Verify your Aadhaar" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 140 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoCard, { backgroundColor: colors.accent }]}>
          <Feather name="shield" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            We verify your identity with an OTP sent to your Aadhaar-linked mobile number. We never
            ask for a photo of your Aadhaar card.
          </Text>
        </View>

        {phase === "number" && (
          <>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Aadhaar Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.input, color: colors.text }]}
                placeholder="XXXX XXXX XXXX"
                placeholderTextColor={colors.mutedForeground}
                value={aadhaarNumber}
                onChangeText={(t) => setAadhaarNumber(t.replace(/[^0-9]/g, "").slice(0, 12))}
                keyboardType="number-pad"
                maxLength={12}
              />
            </View>

            <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
              The OTP goes to the mobile number linked with your Aadhaar. If that differs from your
              registered number, we'll flag it after verification — you can still continue.
            </Text>

            {error && <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>}
            <FooterButton label="Request OTP" onPress={handleSendOtp} disabled={!canSendOtp} loading={sending} />
          </>
        )}

        {phase === "otp" && (
          <>
            <Text style={[styles.formSub, { color: colors.mutedForeground }]}>
              Enter the OTP sent to your Aadhaar-linked mobile number
            </Text>
            <View style={styles.otpWrap}>
              <OtpInput length={6} value={otp} onChange={setOtp} autoFocus />
            </View>
            {error && <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>}
            {verifying && (
              <View style={styles.verifyingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.verifyingText, { color: colors.mutedForeground }]}>Verifying with UIDAI…</Text>
              </View>
            )}
            <Pressable style={styles.resendRow} onPress={handleResend} disabled={resend.isActive}>
              <Text style={[styles.resendText, { color: colors.mutedForeground }]}>Didn't get the code? </Text>
              <Text style={[styles.resendLink, { color: resend.isActive ? colors.mutedForeground : colors.primary }]}>
                {resend.isActive ? `Resend in ${resend.remaining}s` : "Resend OTP"}
              </Text>
            </Pressable>
            <FooterButton
              label="Confirm"
              onPress={() => handleVerify(otp)}
              disabled={otp.length !== 6}
              loading={verifying}
            />
          </>
        )}

        {phase === "confirm" && verifiedName && verifiedDob && (
          <>
            <View style={[styles.successCard, { backgroundColor: colors.successLight }]}>
              <Feather name="check-circle" size={18} color={colors.success} />
              <Text style={[styles.successTitle, { color: colors.success }]}>Aadhaar Verified</Text>
            </View>
            <Text style={[styles.formSub, { color: colors.mutedForeground }]}>
              We found the following details on your Aadhaar
            </Text>
            <View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Name</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{verifiedName}</Text>
              </View>
              <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }]}>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Date of Birth</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatDob(verifiedDob)}</Text>
              </View>
            </View>
            {mobileMismatch && (
              <View style={[styles.mismatchCard, { backgroundColor: colors.warningLight }]}>
                <Feather name="info" size={15} color={colors.warning} />
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  Your Aadhaar-linked mobile differs from your registered number. That's fine — our
                  team will note it during verification.
                </Text>
              </View>
            )}
            <FooterButton label="Confirm & Continue" onPress={handleConfirm} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, gap: 20 },
  infoCard: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14 },
  infoText: { flex: 1, fontSize: 12.5, fontFamily: "Inter_500Medium", lineHeight: 18 },
  field: { gap: 10 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  helperText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    letterSpacing: 2,
  },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  toggleText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  formSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  otpWrap: { marginVertical: 4 },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  verifyingRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  verifyingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  resendRow: { flexDirection: "row", justifyContent: "center" },
  resendText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  resendLink: { fontSize: 13, fontFamily: "Inter_700Bold" },
  successCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 14 },
  successTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  detailsCard: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  detailValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  mismatchCard: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, alignItems: "flex-start" },
  warningText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
});
