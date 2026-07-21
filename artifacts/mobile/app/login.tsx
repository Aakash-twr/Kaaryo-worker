import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OtpInput } from "@/components/onboarding/OtpInput";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useCountdown } from "@/hooks/useCountdown";
import { ApiError } from "@/services/apiClient";

type Phase = "phone" | "otp";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { requestOtp, resendCode, verifyCode } = useAuth();

  const [phase, setPhase] = useState<Phase>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resend = useCountdown(30);

  const handleGetOtp = async () => {
    if (phone.length !== 10) return;
    setSending(true);
    setError(null);
    try {
      const { cooldownSeconds } = await requestOtp(phone);
      setPhase("otp");
      setOtp("");
      resend.start(cooldownSeconds);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't send OTP. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    if (resend.isActive) return;
    setError(null);
    setOtp("");
    try {
      const { cooldownSeconds } = await resendCode(phone);
      resend.start(cooldownSeconds);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't resend OTP. Please try again.");
    }
  };

  const handleVerify = async (code: string) => {
    setVerifying(true);
    setError(null);
    try {
      const result = await verifyCode(phone, code);
      if (result.target) router.replace(result.target as any);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "That code didn't work. Please try again.");
      setOtp("");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (otp.length === 6 && !verifying) {
      handleVerify(otp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <Image
            source={require("@/assets/images/k-worker.png")}
            style={styles.logo}
            resizeMode="cover"
          />
          <Text style={[styles.wordmark, { color: colors.text }]}>Kaaryo</Text>
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>WORKER</Text>
          </View>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Find jobs, get paid, grow your business
          </Text>
        </View>

        {phase === "phone" ? (
          <View style={styles.form}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Enter your mobile number</Text>
            <Text style={[styles.formSub, { color: colors.mutedForeground }]}>
              We'll send you a one-time code to verify it's you.
            </Text>

            <View
              style={[styles.phoneWrap, { backgroundColor: colors.card, borderColor: colors.input }]}
            >
              <View style={styles.prefixWrap}>
                <Text style={[styles.prefix, { color: colors.text }]}>🇮🇳 +91</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TextInput
                style={[styles.phoneInput, { color: colors.text }]}
                placeholder="98765 43210"
                placeholderTextColor={colors.mutedForeground}
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, "").slice(0, 10))}
                keyboardType="phone-pad"
                autoFocus
                maxLength={10}
              />
            </View>

            <Pressable
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primary, opacity: phone.length === 10 ? 1 : 0.5 },
              ]}
              disabled={phone.length !== 10 || sending}
              onPress={handleGetOtp}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitLabel}>Get OTP</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Verify your number</Text>
            <View style={styles.editRow}>
              <Text style={[styles.formSub, { color: colors.mutedForeground }]}>
                Code sent to +91 {phone}
              </Text>
              <Pressable onPress={() => setPhase("phone")}>
                <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
              </Pressable>
            </View>

            <View style={styles.otpWrap}>
              <OtpInput length={6} value={otp} onChange={setOtp} autoFocus />
            </View>

            {error && (
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            )}

            {verifying && (
              <View style={styles.verifyingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.verifyingText, { color: colors.mutedForeground }]}>
                  Verifying…
                </Text>
              </View>
            )}

            <Pressable
              style={styles.resendRow}
              onPress={handleResend}
              disabled={resend.isActive}
            >
              <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
                Didn't get the code?{" "}
              </Text>
              <Text
                style={[
                  styles.resendLink,
                  { color: resend.isActive ? colors.mutedForeground : colors.primary },
                ]}
              >
                {resend.isActive ? `Resend in ${resend.remaining}s` : "Resend OTP"}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  brand: { alignItems: "center", marginBottom: 40 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  wordmark: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  badge: { marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.6 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 12 },
  form: { gap: 16 },
  formTitle: { fontSize: 19, fontFamily: "Inter_700Bold" },
  formSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  editRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  editLink: { fontSize: 13, fontFamily: "Inter_700Bold" },
  phoneWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    height: 54,
  },
  prefixWrap: { paddingHorizontal: 14 },
  prefix: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  divider: { width: 1, height: "60%" },
  phoneInput: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium", paddingHorizontal: 14, height: "100%" },
  otpWrap: { marginTop: 4, marginBottom: 4 },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  verifyingRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  verifyingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  resendRow: { flexDirection: "row", justifyContent: "center", marginTop: 4 },
  resendText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  resendLink: { fontSize: 13, fontFamily: "Inter_700Bold" },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  submitLabel: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
