import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FooterButton } from "@/components/onboarding/FooterButton";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useColors } from "@/hooks/useColors";
import { ApiError } from "@/services/apiClient";
import { fetchStatus, NextStep, submitApplication } from "@/services/onboardingApi";

const DEFAULT_STEPS: NextStep[] = [
  { step: 1, title: "Application review", eta: "24 to 48 hours" },
  { step: 2, title: "References contacted", eta: "" },
  { step: 3, title: "Background verification", eta: "2 to 3 working days" },
  { step: 4, title: "Approval / rejection notification (app + SMS)", eta: "" },
];

// Which tracker step is "current" for each backend status.
const ACTIVE_STEP: Record<string, number> = {
  submitted: 1,
  under_review: 2,
  manual_review: 1,
  info_requested: 1,
  approved: 4,
  rejected: 4,
};

export default function SubmittedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data } = useOnboarding();
  const { fullName, serverStatus, applyServerStatus } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(fullName ?? data.fullName ?? null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [nextSteps, setNextSteps] = useState<NextStep[]>(DEFAULT_STEPS);
  const [status, setStatus] = useState<string>(serverStatus ?? "submitted");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // First arrival only: submit if not already submitted, then load the
  // authoritative status. A 409 here just means a previous visit already
  // submitted it — that's expected on resume, not a failure.
  const submitThenLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      try {
        const res = await submitApplication();
        setName(res.name);
        setReferralCode(res.referralCode);
        if (res.nextSteps?.length) setNextSteps(res.nextSteps);
        setStatus("submitted");
        applyServerStatus("submitted", "submitted");
      } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 409) throw e;
      }

      const st = await fetchStatus();
      setStatus(st.status);
      if (st.referralCode) setReferralCode(st.referralCode);
      applyServerStatus(st.status, st.onboardingStep);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your application status.");
    } finally {
      setLoading(false);
    }
  };

  // Refresh button: just re-fetches status, keeps the tracker on screen the
  // whole time instead of swapping to a full-page spinner.
  const refreshStatus = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const st = await fetchStatus();
      setStatus(st.status);
      if (st.referralCode) setReferralCode(st.referralCode);
      applyServerStatus(st.status, st.onboardingStep);
    } catch (e) {
      setRefreshError(e instanceof ApiError ? e.message : "Couldn't refresh. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    submitThenLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = (name ?? "there").trim().split(" ")[0] || "there";
  const activeStep = ACTIVE_STEP[status] ?? 1;
  const isManualReview = status === "manual_review";
  const isRejected = status === "rejected";
  const isApproved = status === "approved";
  const isInfoRequested = status === "info_requested";

  const handleShare = () => {
    Share.share({
      message: referralCode
        ? `I just joined Kaaryo! Use my code ${referralCode} when you sign up and we both earn a joining bonus once you complete onboarding. https://kaaryo.app/join`
        : "I just joined Kaaryo as a service professional! Join and we both earn a joining bonus. https://kaaryo.app/join",
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Submitting your application…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingHorizontal: 32 }]}>
        <Feather name="wifi-off" size={32} color={colors.mutedForeground} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Something went wrong</Text>
        <Text style={[styles.errorBody, { color: colors.mutedForeground }]}>{error}</Text>
        <View style={{ height: 16 }} />
        <FooterButton label="Try again" onPress={submitThenLoad} />
      </View>
    );
  }

  // Header varies by outcome.
  const header = isApproved
    ? { icon: "check-circle", tint: colors.success, bg: colors.successLight, title: `Welcome aboard, ${firstName}!`, sub: "Your application has been approved." }
    : isRejected
      ? { icon: "x-circle", tint: colors.destructive, bg: "#FEE2E2", title: `Hi ${firstName}`, sub: "Unfortunately your application was not approved this time." }
      : isManualReview
        ? { icon: "clock", tint: colors.warning, bg: colors.warningLight, title: `Hi ${firstName}, hang tight`, sub: "Your application is under manual review by our team." }
        : { icon: "check-circle", tint: colors.success, bg: colors.successLight, title: `Congratulations, ${firstName}!`, sub: "Your application to become a Kaaryo Worker has been submitted." };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.badge, { backgroundColor: header.bg }]}>
        <Feather name={header.icon as any} size={40} color={header.tint} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{header.title}</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{header.sub}</Text>

      {!isApproved && !isRejected && (
        <Pressable
          style={[styles.refreshBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={refreshStatus}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="refresh-cw" size={15} color={colors.primary} />
          )}
          <Text style={[styles.refreshText, { color: colors.primary }]}>
            {refreshing ? "Checking for updates…" : "Refresh status"}
          </Text>
        </Pressable>
      )}
      {refreshError && (
        <Text style={[styles.refreshErrorText, { color: colors.destructive }]}>{refreshError}</Text>
      )}

      {isInfoRequested && (
        <View style={[styles.infoBanner, { backgroundColor: colors.warningLight }]}>
          <Feather name="alert-circle" size={15} color={colors.warning} />
          <Text style={[styles.infoBannerText, { color: colors.warning }]}>
            Our team needs a bit more information. Please check your SMS for details.
          </Text>
        </View>
      )}

      {!isApproved && !isRejected && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>What happens next</Text>
          <View style={styles.tracker}>
            {nextSteps.map((stage, i) => {
              const stageNum = stage.step ?? i + 1;
              const done = stageNum < activeStep;
              const current = stageNum === activeStep && !isManualReview;
              const isLast = i === nextSteps.length - 1;
              return (
                <View key={stage.title} style={styles.stageRow}>
                  <View style={styles.stageIconCol}>
                    <View
                      style={[
                        styles.stageDot,
                        {
                          backgroundColor: done ? colors.success : current ? colors.primary : colors.secondary,
                          borderColor: done ? colors.success : current ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {done ? (
                        <Feather name="check" size={13} color="#fff" />
                      ) : (
                        <Text style={[styles.stageNum, { color: current ? "#fff" : colors.mutedForeground }]}>
                          {stageNum}
                        </Text>
                      )}
                    </View>
                    {!isLast && <View style={[styles.stageLine, { backgroundColor: colors.border }]} />}
                  </View>
                  <View style={styles.stageContent}>
                    <Text style={[styles.stageTitle, { color: colors.text }]}>{stage.title}</Text>
                    {!!stage.eta && <Text style={[styles.stageEta, { color: colors.primary }]}>{stage.eta}</Text>}
                    {current && (
                      <View style={[styles.pill, { backgroundColor: colors.accent }]}>
                        <Text style={[styles.pillText, { color: colors.primary }]}>In progress</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {referralCode && !isRejected && (
        <Pressable style={[styles.shareBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={handleShare}>
          <Feather name="share-2" size={16} color={colors.primary} />
          <Text style={[styles.shareText, { color: colors.text }]}>Share Kaaryo & earn a joining bonus</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  errorTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 8 },
  errorBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  scroll: { paddingHorizontal: 24, alignItems: "center" },
  badge: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8, paddingHorizontal: 12 },
  infoBanner: { flexDirection: "row", gap: 8, padding: 14, borderRadius: 14, marginTop: 20, alignItems: "flex-start", width: "100%" },
  infoBannerText: { flex: 1, fontSize: 12.5, fontFamily: "Inter_500Medium", lineHeight: 18 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", alignSelf: "flex-start", marginTop: 32, marginBottom: 16 },
  tracker: { width: "100%" },
  stageRow: { flexDirection: "row", gap: 14 },
  stageIconCol: { alignItems: "center", width: 28 },
  stageDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stageNum: { fontSize: 12, fontFamily: "Inter_700Bold" },
  stageLine: { width: 2, flex: 1, minHeight: 28, marginVertical: 2 },
  stageContent: { flex: 1, paddingBottom: 20 },
  stageTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  stageEta: { fontSize: 11.5, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  pill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginTop: 6 },
  pillText: { fontSize: 10.5, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    width: "100%",
    justifyContent: "center",
    marginTop: 12,
  },
  shareText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 18,
    marginTop: 20,
  },
  refreshText: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  refreshErrorText: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 8 },
});
