import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FooterButton } from "@/components/onboarding/FooterButton";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { PickerModal, PickerOption } from "@/components/onboarding/PickerModal";
import { SelectChip } from "@/components/onboarding/SelectChip";
import { GENDER_OPTIONS, WORKER_ROLES } from "@/constants/onboarding";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useColors } from "@/hooks/useColors";
import { ApiError } from "@/services/apiClient";
import { savePersonal } from "@/services/onboardingApi";
import { calcAge, formatDob, toYMD } from "@/utils/date";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type DobPickerStep = "day" | "month" | "year" | null;

export default function PersonalDetailsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateData, setLastRoute } = useOnboarding();
  const { setOnboardingStep } = useAuth();

  const [fullName, setFullName] = useState(data.fullName);
  const [role, setRole] = useState(data.role);
  const [gender, setGender] = useState(data.gender);
  const [dob, setDob] = useState(data.dob);
  const [dobError, setDobError] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState(data.selfieUri);
  const [selfieMimeType, setSelfieMimeType] = useState<string | undefined>(undefined);
  const [pickerStep, setPickerStep] = useState<DobPickerStep>(null);
  const [draftDay, setDraftDay] = useState<number | null>(null);
  const [draftMonth, setDraftMonth] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const canContinue = !!role && fullName.trim().length > 1 && !!dob && !!gender && !!selfieUri;

  const openDobPicker = () => {
    setDraftDay(null);
    setDraftMonth(null);
    setPickerStep("day");
  };

  const dayOptions: PickerOption[] = Array.from({ length: 31 }, (_, i) => ({
    label: String(i + 1),
    value: String(i + 1),
  }));
  const monthOptions: PickerOption[] = MONTH_NAMES.map((m, i) => ({ label: m, value: String(i) }));
  const currentYear = new Date().getFullYear();
  const yearOptions: PickerOption[] = Array.from({ length: 80 }, (_, i) => {
    const y = currentYear - i;
    return { label: String(y), value: String(y) };
  });

  let modal: { title: string; options: PickerOption[]; onSelect: (v: string) => void; closeOnSelect: boolean } | null =
    null;
  if (pickerStep === "day") {
    modal = {
      title: "Day",
      options: dayOptions,
      closeOnSelect: false,
      onSelect: (v) => {
        setDraftDay(parseInt(v, 10));
        setPickerStep("month");
      },
    };
  } else if (pickerStep === "month") {
    modal = {
      title: "Month",
      options: monthOptions,
      closeOnSelect: false,
      onSelect: (v) => {
        setDraftMonth(parseInt(v, 10));
        setPickerStep("year");
      },
    };
  } else if (pickerStep === "year") {
    modal = {
      title: "Year",
      options: yearOptions,
      closeOnSelect: true,
      onSelect: (v) => {
        const year = parseInt(v, 10);
        const finalDate = new Date(year, draftMonth ?? 0, draftDay ?? 1);
        setPickerStep(null);
        if (calcAge(finalDate) < 18) {
          setDobError("You must be 18 or older to register as a Kaaryo worker.");
          setDob(null);
          return;
        }
        setDobError(null);
        setDob(finalDate.toISOString());
      },
    };
  }

  const takeSelfie = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Camera access needed",
        "Kaaryo needs camera access to verify your identity with a live selfie."
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setSelfieUri(result.assets[0].uri);
      setSelfieMimeType(result.assets[0].mimeType);
    }
  };

  const handleContinue = async () => {
    if (!canContinue || !dob || !gender || !selfieUri) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const res = await savePersonal({
        fullName: fullName.trim(),
        dob: toYMD(dob),
        gender,
        photoUri: selfieUri,
        photoMimeType: selfieMimeType,
      });
      updateData({ fullName: fullName.trim(), role, gender, dob, selfieUri });
      setOnboardingStep(res.onboardingStep);
      setLastRoute("location");
      router.push("/onboarding/location");
    } catch (e) {
      setApiError(e instanceof ApiError ? e.message : "Couldn't save your details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OnboardingProgress step={1} total={7} title="Tell us about yourself" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 140 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>I want to work as a</Text>
          <View style={styles.chipStack}>
            {WORKER_ROLES.map((r) => (
              <SelectChip
                key={r.id}
                label={r.name}
                icon={r.icon}
                selected={role === r.id}
                onPress={() => setRole(r.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.input, color: colors.text }]}
            placeholder="As per your ID"
            placeholderTextColor={colors.mutedForeground}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Date of Birth</Text>
          <Pressable
            style={[styles.dobField, { backgroundColor: colors.card, borderColor: colors.input }]}
            onPress={openDobPicker}
          >
            <Feather name="calendar" size={16} color={colors.mutedForeground} />
            <Text style={[styles.dobText, { color: dob ? colors.text : colors.mutedForeground }]}>
              {dob ? formatDob(dob) : "Select your date of birth"}
            </Text>
          </Pressable>
          {dobError && <Text style={[styles.errorText, { color: colors.destructive }]}>{dobError}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Gender</Text>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => setGender(g.id)}
                style={[
                  styles.genderChip,
                  {
                    backgroundColor: gender === g.id ? colors.accent : colors.card,
                    borderColor: gender === g.id ? colors.primary : colors.border,
                    borderWidth: gender === g.id ? 1.5 : 1,
                  },
                ]}
              >
                <Text style={[styles.genderText, { color: gender === g.id ? colors.primary : colors.text }]}>
                  {g.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Profile Photo</Text>
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            Take a live selfie for identity verification — gallery photos aren't accepted.
          </Text>
          {selfieUri ? (
            <View style={styles.photoPreviewWrap}>
              <Image source={{ uri: selfieUri }} style={styles.photoPreview} />
              <Pressable
                style={[styles.retakeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={takeSelfie}
              >
                <Feather name="refresh-cw" size={14} color={colors.text} />
                <Text style={[styles.retakeText, { color: colors.text }]}>Retake</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.photoPlaceholder, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={takeSelfie}
            >
              <View style={[styles.cameraIconWrap, { backgroundColor: colors.accent }]}>
                <Feather name="camera" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.photoPlaceholderText, { color: colors.text }]}>Tap to open front camera</Text>
            </Pressable>
          )}
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

      <PickerModal
        visible={!!modal}
        title={modal?.title ?? ""}
        options={modal?.options ?? []}
        onSelect={(v) => modal?.onSelect(v)}
        onClose={() => setPickerStep(null)}
        closeOnSelect={modal?.closeOnSelect ?? true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, gap: 24 },
  field: { gap: 10, marginBottom: 4 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  helperText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -4 },
  chipStack: { gap: 10 },
  chipRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  dobField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  dobText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  errorText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  genderChip: { flex: 1, minWidth: "30%", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  genderText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  photoPlaceholder: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 32,
    alignItems: "center",
    gap: 10,
  },
  cameraIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  photoPlaceholderText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  photoPreviewWrap: { alignItems: "center", gap: 12 },
  photoPreview: { width: 140, height: 140, borderRadius: 70 },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retakeText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  apiError: { fontSize: 12.5, fontFamily: "Inter_500Medium", textAlign: "center", marginBottom: 10 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    ...Platform.select({ ios: {}, android: {} }),
  },
});
