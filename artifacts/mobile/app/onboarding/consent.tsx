import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConsentCheckbox } from "@/components/onboarding/ConsentCheckbox";
import { FooterButton } from "@/components/onboarding/FooterButton";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { OtpInput } from "@/components/onboarding/OtpInput";
import { SignaturePad } from "@/components/onboarding/SignaturePad";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useColors } from "@/hooks/useColors";
import { ApiError } from "@/services/apiClient";
import { requestEsignOtp, saveConsent, verifyEsignOtp } from "@/services/onboardingApi";

const CHECKS = [
  { icon: "search", text: "Criminal record check" },
  { icon: "home", text: "Address verification" },
  { icon: "phone-call", text: "Reference call" },
];

type SignMethod = "esign" | "draw";
type EsignPhase = "idle" | "otp" | "verified";

/** Builds a standalone SVG document around the signature pad's path data. */
async function writeSignatureFile(pathData: string): Promise<string> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160"><path d="${pathData}" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;
  const uri = `${FileSystem.cacheDirectory}signature_${Date.now()}.svg`;
  await FileSystem.writeAsStringAsync(uri, svg);
  return uri;
}

export default function ConsentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateData } = useOnboarding();
  const { setOnboardingStep } = useAuth();

  const [consent1, setConsent1] = useState(data.consent1);
  const [consent2, setConsent2] = useState(data.consent2);
  const [signMethod, setSignMethod] = useState<SignMethod>("esign");

  // e-sign path
  const [esignPhase, setEsignPhase] = useState<EsignPhase>("idle");
  const [esignOtp, setEsignOtp] = useState("");
  const [esignBusy, setEsignBusy] = useState(false);
  const [esignError, setEsignError] = useState<string | null>(null);

  // draw path
  const [signature, setSignature] = useState<string | null>(data.signature);

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const signingDone =
    signMethod === "esign" ? esignPhase === "verified" : !!signature;
  const canSubmit = consent1 && consent2 && signingDone;

  const handleSendEsignOtp = async () => {
    setEsignBusy(true);
    setEsignError(null);
    try {
      await requestEsignOtp();
      setEsignPhase("otp");
      setEsignOtp("");
    } catch (e) {
      setEsignError(e instanceof ApiError ? e.message : "Couldn't start e-sign. Please try again.");
    } finally {
      setEsignBusy(false);
    }
  };

  const handleVerifyEsign = async (code: string) => {
    setEsignBusy(true);
    setEsignError(null);
    try {
      await verifyEsignOtp(code);
      setEsignPhase("verified");
    } catch (e) {
      setEsignError(e instanceof ApiError ? e.message : "Invalid e-sign OTP.");
      setEsignOtp("");
    } finally {
      setEsignBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setApiError(null);
    try {
      let signatureUri: string | null = null;
      // e-sign path needs no file — the server remembers the verified OTP.
      if (signMethod === "draw" && signature) {
        signatureUri = await writeSignatureFile(signature);
      }
      const res = await saveConsent({
        backgroundCheck: consent1,
        infoAccurate: consent2,
        signatureUri,
      });
      updateData({ consent1, consent2, signature });
      setOnboardingStep(res.onboardingStep);
      router.replace("/onboarding/submitted");
    } catch (e) {
      setApiError(e instanceof ApiError ? e.message : "Couldn't record your consent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OnboardingProgress step={8} total={8} title="Background Check Consent" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 140 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Kaaryo runs a background and criminal record check on all workers to make sure every
          customer feels safe letting you into their home.
        </Text>

        <View style={[styles.checksCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.checksTitle, { color: colors.mutedForeground }]}>THIS INVOLVES</Text>
          {CHECKS.map((c) => (
            <View key={c.text} style={styles.checkRow}>
              <Feather name={c.icon as any} size={15} color={colors.primary} />
              <Text style={[styles.checkText, { color: colors.text }]}>{c.text}</Text>
            </View>
          ))}
          <View style={[styles.etaRow, { borderTopColor: colors.border }]}>
            <Feather name="clock" size={14} color={colors.mutedForeground} />
            <Text style={[styles.etaText, { color: colors.mutedForeground }]}>
              Estimated time: 2 to 3 working days
            </Text>
          </View>
        </View>

        <View style={styles.consentGroup}>
          <ConsentCheckbox checked={consent1} onToggle={() => setConsent1((v) => !v)}>
            I consent to Kaaryo running a background verification check on me.
          </ConsentCheckbox>
          <ConsentCheckbox checked={consent2} onToggle={() => setConsent2((v) => !v)}>
            I confirm that all information I have provided is accurate and true.
          </ConsentCheckbox>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Sign your consent</Text>

          <View style={[styles.segment, { backgroundColor: colors.secondary }]}>
            <Pressable
              style={[styles.segmentBtn, signMethod === "esign" && { backgroundColor: colors.card }]}
              onPress={() => setSignMethod("esign")}
            >
              <Text style={[styles.segmentLabel, { color: signMethod === "esign" ? colors.primary : colors.mutedForeground }]}>
                e-Sign with Aadhaar
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segmentBtn, signMethod === "draw" && { backgroundColor: colors.card }]}
              onPress={() => setSignMethod("draw")}
            >
              <Text style={[styles.segmentLabel, { color: signMethod === "draw" ? colors.primary : colors.mutedForeground }]}>
                Draw signature
              </Text>
            </Pressable>
          </View>

          {signMethod === "esign" ? (
            <View style={styles.esignBox}>
              {esignPhase === "idle" && (
                <>
                  <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                    We'll send an OTP to your Aadhaar-linked mobile to legally e-sign this consent.
                  </Text>
                  <FooterButton label="Send e-Sign OTP" onPress={handleSendEsignOtp} loading={esignBusy} />
                </>
              )}
              {esignPhase === "otp" && (
                <>
                  <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                    Enter the OTP sent to your Aadhaar-linked mobile.
                  </Text>
                  <OtpInput length={6} value={esignOtp} onChange={(v) => {
                    setEsignOtp(v);
                    if (v.length === 6 && !esignBusy) handleVerifyEsign(v);
                  }} autoFocus />
                  {esignBusy && <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />}
                </>
              )}
              {esignPhase === "verified" && (
                <View style={[styles.verifiedRow, { backgroundColor: colors.successLight }]}>
                  <Feather name="check-circle" size={16} color={colors.success} />
                  <Text style={[styles.verifiedText, { color: colors.success }]}>
                    Aadhaar e-sign verified.
                  </Text>
                </View>
              )}
              {esignError && <Text style={[styles.errorText, { color: colors.destructive }]}>{esignError}</Text>}
            </View>
          ) : (
            <SignaturePad onChange={setSignature} />
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        {apiError && <Text style={[styles.errorText, { color: colors.destructive, marginBottom: 10 }]}>{apiError}</Text>}
        <FooterButton label="Submit Application" onPress={handleSubmit} disabled={!canSubmit} loading={submitting} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, gap: 22 },
  paragraph: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  checksCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  checksTitle: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkText: { fontSize: 13.5, fontFamily: "Inter_500Medium" },
  etaRow: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, paddingTop: 12, marginTop: 2 },
  etaText: { fontSize: 12.5, fontFamily: "Inter_400Regular" },
  consentGroup: { gap: 16 },
  field: { gap: 12 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  segment: { flexDirection: "row", borderRadius: 12, padding: 4 },
  segmentBtn: { flex: 1, borderRadius: 9, paddingVertical: 9, alignItems: "center" },
  segmentLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  esignBox: { gap: 12 },
  helperText: { fontSize: 12.5, fontFamily: "Inter_400Regular", lineHeight: 18 },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12 },
  verifiedText: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  errorText: { fontSize: 12.5, fontFamily: "Inter_500Medium", textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
