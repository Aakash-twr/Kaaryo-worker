import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FooterButton } from "@/components/onboarding/FooterButton";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { PickerModal, PickerOption } from "@/components/onboarding/PickerModal";
import { CITIES, RADIUS_OPTIONS } from "@/constants/onboarding";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useColors } from "@/hooks/useColors";
import { ApiError } from "@/services/apiClient";
import { fetchCities, fetchLocalitySuggestions, saveLocation } from "@/services/onboardingApi";

export default function LocationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateData, setLastRoute } = useOnboarding();
  const { setOnboardingStep } = useAuth();

  const [city, setCity] = useState(data.city);
  const [locality, setLocality] = useState(data.locality);
  const [pincode, setPincode] = useState(data.pincode);
  const [address, setAddress] = useState(data.address);
  const [radiusKm, setRadiusKm] = useState(data.radiusKm);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [localityModalOpen, setLocalityModalOpen] = useState(false);
  const [cities, setCities] = useState<string[]>(CITIES);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Operating cities come from the backend; CITIES is only a fallback.
  useEffect(() => {
    fetchCities()
      .then((list) => {
        if (list.length) setCities(list);
      })
      .catch(() => {});
  }, []);

  const cityOptions: PickerOption[] = cities.map((c) => ({ label: c, value: c }));

  const canContinue =
    !!city && !!locality && pincode.length === 6 && address.trim().length > 5 && !!radiusKm;

  const handleContinue = async () => {
    if (!canContinue || !city || !locality || !radiusKm) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const res = await saveLocation({
        city,
        area: locality,
        pincode,
        address: address.trim(),
        travelRadiusKm: radiusKm,
      });
      updateData({ city, locality, pincode, address: address.trim(), radiusKm });
      setOnboardingStep(res.onboardingStep);
      setLastRoute("aadhaar");
      router.push("/onboarding/aadhaar");
    } catch (e) {
      setApiError(e instanceof ApiError ? e.message : "Couldn't save your location. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OnboardingProgress step={2} total={8} title="Where are you based?" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 140 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>City</Text>
          <Pressable
            style={[styles.selectField, { backgroundColor: colors.card, borderColor: colors.input }]}
            onPress={() => setCityModalOpen(true)}
          >
            <Feather name="map-pin" size={16} color={colors.mutedForeground} />
            <Text style={[styles.selectText, { color: city ? colors.text : colors.mutedForeground }]}>
              {city ?? "Select your city"}
            </Text>
            <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Area / Locality</Text>
          <Pressable
            style={[
              styles.selectField,
              { backgroundColor: colors.card, borderColor: colors.input, opacity: city ? 1 : 0.5 },
            ]}
            onPress={() => city && setLocalityModalOpen(true)}
            disabled={!city}
          >
            <Feather name="navigation" size={16} color={colors.mutedForeground} />
            <Text style={[styles.selectText, { color: locality ? colors.text : colors.mutedForeground }]}>
              {locality ?? (city ? "Select your locality" : "Select a city first")}
            </Text>
            <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Pincode</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.input, color: colors.text }]}
            placeholder="560001"
            placeholderTextColor={colors.mutedForeground}
            value={pincode}
            onChangeText={(t) => setPincode(t.replace(/[^0-9]/g, "").slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Full Residential Address</Text>
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            This is your registered address and will be used for background verification.
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textarea,
              { backgroundColor: colors.card, borderColor: colors.input, color: colors.text },
            ]}
            placeholder="House / flat no., building, street"
            placeholderTextColor={colors.mutedForeground}
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>How far are you willing to travel for work?</Text>
          <View style={styles.chipRow}>
            {RADIUS_OPTIONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => setRadiusKm(r)}
                style={[
                  styles.radiusChip,
                  {
                    backgroundColor: radiusKm === r ? colors.accent : colors.card,
                    borderColor: radiusKm === r ? colors.primary : colors.border,
                    borderWidth: radiusKm === r ? 1.5 : 1,
                  },
                ]}
              >
                <Text style={[styles.radiusText, { color: radiusKm === r ? colors.primary : colors.text }]}>
                  {r} km
                </Text>
              </Pressable>
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

      <PickerModal
        visible={cityModalOpen}
        title="Select City"
        options={cityOptions}
        onSelect={(v) => {
          setCity(v);
          setLocality(null);
        }}
        onClose={() => setCityModalOpen(false)}
      />

      <PickerModal
        visible={localityModalOpen}
        title="Select Locality"
        options={[]}
        searchable
        onSearch={(q) =>
          city ? fetchLocalitySuggestions(city, q).then((r) => r.map((l) => ({ label: l, value: l }))) : Promise.resolve([])
        }
        onSelect={setLocality}
        onClose={() => setLocalityModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, gap: 24 },
  field: { gap: 10, marginBottom: 4 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  helperText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -4 },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  textarea: { height: 84, paddingTop: 14, textAlignVertical: "top" },
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  selectText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  chipRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  radiusChip: { flex: 1, minWidth: "22%", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  radiusText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
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
