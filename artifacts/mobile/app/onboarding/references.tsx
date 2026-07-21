import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConsentCheckbox } from "@/components/onboarding/ConsentCheckbox";
import { FooterButton } from "@/components/onboarding/FooterButton";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { SelectChip } from "@/components/onboarding/SelectChip";
import { REFERENCE_RELATIONSHIP_OPTIONS } from "@/constants/onboarding";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useColors } from "@/hooks/useColors";
import { ApiError } from "@/services/apiClient";
import { saveReferences } from "@/services/onboardingApi";
import { ReferenceContact } from "@/types/onboarding";

export default function ReferencesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateData, setLastRoute } = useOnboarding();
  const { phone, setOnboardingStep } = useAuth();

  const ownPhoneDigits = (phone ?? "").replace(/[^0-9]/g, "").slice(-10);

  const [ref1, setRef1] = useState<ReferenceContact>(data.reference1);
  const [addRef2, setAddRef2] = useState(!!data.reference2.name || !!data.reference2.phone);
  const [ref2, setRef2] = useState<ReferenceContact>(data.reference2);
  const [consent, setConsent] = useState(data.referenceConsent);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const ref1Complete = ref1.name.trim().length > 1 && !!ref1.relationship && ref1.phone.length === 10;
  const ref1OwnNumberConflict = ref1.phone.length === 10 && ref1.phone === ownPhoneDigits;

  const ref2Complete = !addRef2 || (ref2.name.trim().length > 1 && !!ref2.relationship && ref2.phone.length === 10);
  const ref2OwnNumberConflict = addRef2 && ref2.phone.length === 10 && ref2.phone === ownPhoneDigits;
  const duplicatePhoneConflict =
    addRef2 && ref1.phone.length === 10 && ref2.phone.length === 10 && ref1.phone === ref2.phone;

  const canContinue =
    ref1Complete &&
    !ref1OwnNumberConflict &&
    ref2Complete &&
    !ref2OwnNumberConflict &&
    !duplicatePhoneConflict &&
    consent;

  const handleContinue = async () => {
    if (!canContinue) return;
    const references = [ref1, ...(addRef2 ? [ref2] : [])].map((r) => ({
      name: r.name.trim(),
      relationship: r.relationship as string,
      phone: r.phone,
    }));
    setSubmitting(true);
    setApiError(null);
    try {
      const res = await saveReferences({ referenceConsent: consent, references });
      updateData({
        reference1: ref1,
        reference2: addRef2 ? ref2 : { name: "", relationship: null, phone: "" },
        referenceConsent: consent,
      });
      setOnboardingStep(res.onboardingStep);
      setLastRoute("consent");
      router.push("/onboarding/consent");
    } catch (e) {
      setApiError(e instanceof ApiError ? e.message : "Couldn't save your references. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OnboardingProgress step={7} total={8} title="Reference Details" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 140 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoCard, { backgroundColor: colors.accent }]}>
          <Feather name="phone-call" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Our team will call your references directly to verify your work history and character.
          </Text>
        </View>

        <ReferenceForm
          title="Reference 1"
          required
          value={ref1}
          onChange={setRef1}
          ownNumberConflict={ref1OwnNumberConflict}
        />

        {!addRef2 ? (
          <Pressable
            style={[styles.addRefBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setAddRef2(true)}
          >
            <Feather name="plus-circle" size={16} color={colors.primary} />
            <Text style={[styles.addRefText, { color: colors.text }]}>Add a second reference (recommended)</Text>
          </Pressable>
        ) : (
          <ReferenceForm
            title="Reference 2"
            required={false}
            value={ref2}
            onChange={setRef2}
            ownNumberConflict={ref2OwnNumberConflict}
            onRemove={() => {
              setAddRef2(false);
              setRef2({ name: "", relationship: null, phone: "" });
            }}
          />
        )}

        {duplicatePhoneConflict && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            Reference 1 and Reference 2 can't share the same phone number.
          </Text>
        )}

        <ConsentCheckbox checked={consent} onToggle={() => setConsent((v) => !v)}>
          I allow Kaaryo to contact my references for verification.
        </ConsentCheckbox>
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

function ReferenceForm({
  title,
  required,
  value,
  onChange,
  ownNumberConflict,
  onRemove,
}: {
  title: string;
  required: boolean;
  value: ReferenceContact;
  onChange: (v: ReferenceContact) => void;
  ownNumberConflict: boolean;
  onRemove?: () => void;
}) {
  const colors = useColors();

  return (
    <View style={[styles.refCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.refCardHeader}>
        <Text style={[styles.refCardTitle, { color: colors.text }]}>
          {title} {required && <Text style={{ color: colors.destructive }}>*</Text>}
        </Text>
        {onRemove && (
          <Pressable onPress={onRemove} hitSlop={8}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.input, color: colors.text }]}
          placeholder="Full name"
          placeholderTextColor={colors.mutedForeground}
          value={value.name}
          onChangeText={(t) => onChange({ ...value, name: t })}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Relationship</Text>
        <View style={styles.chipStack}>
          {REFERENCE_RELATIONSHIP_OPTIONS.map((r) => (
            <SelectChip
              key={r.id}
              label={r.label}
              selected={value.relationship === r.id}
              onPress={() => onChange({ ...value, relationship: r.id })}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.input, color: colors.text }]}
          placeholder="98765 43210"
          placeholderTextColor={colors.mutedForeground}
          value={value.phone}
          onChangeText={(t) => onChange({ ...value, phone: t.replace(/[^0-9]/g, "").slice(0, 10) })}
          keyboardType="phone-pad"
          maxLength={10}
        />
        {ownNumberConflict && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            This can't be your own registered number.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, gap: 18 },
  infoCard: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14 },
  infoText: { flex: 1, fontSize: 12.5, fontFamily: "Inter_500Medium", lineHeight: 18 },
  refCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 16 },
  refCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  refCardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  field: { gap: 10 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  chipStack: { gap: 8 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  errorText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  apiError: { fontSize: 12.5, fontFamily: "Inter_500Medium", textAlign: "center", marginBottom: 10 },
  addRefBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 14,
  },
  addRefText: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
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
