import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FooterButton } from "@/components/onboarding/FooterButton";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { SelectChip } from "@/components/onboarding/SelectChip";
import {
  EXPERIENCE_OPTIONS,
  ROLE_EQUIPMENT,
  ROLE_SKILLS,
  WORKER_ROLES,
  WORKING_DAYS_OPTIONS,
  WORKING_HOURS_OPTIONS,
} from "@/constants/onboarding";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useColors } from "@/hooks/useColors";
import { ApiError } from "@/services/apiClient";
import { saveWorkDetails } from "@/services/onboardingApi";

export default function WorkDetailsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateData, setLastRoute } = useOnboarding();
  const { setOnboardingStep } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const role = data.role ?? "cleaning";
  const roleLabel = WORKER_ROLES.find((r) => r.id === role)?.name ?? "service";
  const skillOptions = ROLE_SKILLS[role];
  const equipmentOptions = ROLE_EQUIPMENT[role];

  const [skills, setSkills] = useState<string[]>(data.skills);
  const [experience, setExperience] = useState(data.experience);
  const [workedBefore, setWorkedBefore] = useState(data.workedBefore);
  const [priorPlatformName, setPriorPlatformName] = useState(data.priorPlatformName);
  const [priorPlatformDuration, setPriorPlatformDuration] = useState(data.priorPlatformDuration);
  const [ownsEquipment, setOwnsEquipment] = useState(data.ownsEquipment);
  const [equipment, setEquipment] = useState<string[]>(data.equipment);
  const [preferredHours, setPreferredHours] = useState(data.preferredHours);
  const [preferredDays, setPreferredDays] = useState(data.preferredDays);

  const toggleSkill = (s: string) =>
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const toggleEquipment = (e: string) =>
    setEquipment((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));

  const canContinue =
    skills.length > 0 &&
    !!experience &&
    workedBefore !== null &&
    (workedBefore === false || (priorPlatformName.trim().length > 0 && priorPlatformDuration.trim().length > 0)) &&
    ownsEquipment !== null &&
    !!preferredHours &&
    !!preferredDays;

  const handleContinue = async () => {
    if (!canContinue || !experience || workedBefore === null || ownsEquipment === null || !preferredHours || !preferredDays) {
      return;
    }
    setSubmitting(true);
    setApiError(null);
    try {
      const res = await saveWorkDetails({
        skills,
        experience,
        workedBefore,
        priorPlatformName: priorPlatformName.trim(),
        priorPlatformDuration: priorPlatformDuration.trim(),
        ownsEquipment,
        equipment,
        preferredHours,
        preferredDays,
      });
      updateData({
        skills,
        experience,
        workedBefore,
        priorPlatformName: workedBefore ? priorPlatformName.trim() : "",
        priorPlatformDuration: workedBefore ? priorPlatformDuration.trim() : "",
        ownsEquipment,
        equipment: ownsEquipment ? equipment : [],
        preferredHours,
        preferredDays,
      });
      setOnboardingStep(res.onboardingStep);
      setLastRoute("references");
      router.push("/onboarding/references");
    } catch (e) {
      setApiError(e instanceof ApiError ? e.message : "Couldn't save your work details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OnboardingProgress step={5} total={7} title="Your work details" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 140 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>
            What {roleLabel.toLowerCase()} services can you provide?
          </Text>
          <View style={styles.chipStack}>
            {skillOptions.map((s) => (
              <SelectChip key={s} label={s} selected={skills.includes(s)} onPress={() => toggleSkill(s)} />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Years of experience</Text>
          <View style={styles.chipStack}>
            {EXPERIENCE_OPTIONS.map((e) => (
              <SelectChip
                key={e.id}
                label={e.label}
                selected={experience === e.id}
                onPress={() => setExperience(e.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>
            Have you worked with any platform or agency before?
          </Text>
          <View style={styles.chipRow}>
            <YesNoChip label="Yes" active={workedBefore === true} onPress={() => setWorkedBefore(true)} />
            <YesNoChip label="No" active={workedBefore === false} onPress={() => setWorkedBefore(false)} />
          </View>
          {workedBefore && (
            <View style={{ gap: 12, marginTop: 8 }}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.input, color: colors.text }]}
                placeholder="Name of platform or agency"
                placeholderTextColor={colors.mutedForeground}
                value={priorPlatformName}
                onChangeText={setPriorPlatformName}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.input, color: colors.text }]}
                placeholder="Approximate duration (e.g. 8 months)"
                placeholderTextColor={colors.mutedForeground}
                value={priorPlatformDuration}
                onChangeText={setPriorPlatformDuration}
              />
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Do you own basic {roleLabel.toLowerCase()} equipment?</Text>
          <View style={styles.chipRow}>
            <YesNoChip label="Yes" active={ownsEquipment === true} onPress={() => setOwnsEquipment(true)} />
            <YesNoChip label="No" active={ownsEquipment === false} onPress={() => setOwnsEquipment(false)} />
          </View>
          {ownsEquipment && (
            <View style={[styles.chipStack, { marginTop: 8 }]}>
              {equipmentOptions.map((eq) => (
                <SelectChip key={eq} label={eq} selected={equipment.includes(eq)} onPress={() => toggleEquipment(eq)} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Preferred working hours</Text>
          <View style={styles.chipStack}>
            {WORKING_HOURS_OPTIONS.map((h) => (
              <SelectChip
                key={h.id}
                label={h.label}
                sub={h.sub}
                selected={preferredHours === h.id}
                onPress={() => setPreferredHours(h.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Preferred working days</Text>
          <View style={styles.chipRow}>
            {WORKING_DAYS_OPTIONS.map((d) => (
              <View key={d.id} style={{ flex: 1 }}>
                <SelectChip label={d.label} selected={preferredDays === d.id} onPress={() => setPreferredDays(d.id)} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        {apiError && <Text style={[styles.apiError, { color: colors.destructive }]}>{apiError}</Text>}
        <FooterButton label="Continue" onPress={handleContinue} disabled={!canContinue} loading={submitting} />
      </View>
    </View>
  );
}

function YesNoChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.yesNoChip,
        {
          backgroundColor: active ? colors.accent : colors.card,
          borderColor: active ? colors.primary : colors.border,
          borderWidth: active ? 1.5 : 1,
        },
      ]}
    >
      <Text style={[styles.yesNoText, { color: active ? colors.primary : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, gap: 26 },
  field: { gap: 10, marginBottom: 4 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  chipStack: { gap: 10 },
  chipRow: { flexDirection: "row", gap: 10 },
  yesNoChip: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  yesNoText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  apiError: { fontSize: 12.5, fontFamily: "Inter_500Medium", textAlign: "center", marginBottom: 10 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
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
