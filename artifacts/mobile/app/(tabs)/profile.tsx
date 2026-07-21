import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PickerModal } from "@/components/onboarding/PickerModal";
import { AddSpecializationModal } from "@/components/profile/AddSpecializationModal";
import { absoluteUrl } from "@/constants/config";
import { getServiceById } from "@/constants/services";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useTheme, ThemeMode } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { ApiError } from "@/services/apiClient";
import { fetchCities } from "@/services/onboardingApi";
import {
  fetchProfile,
  updateExpertise,
  updateProfile,
} from "@/services/profileApi";
import {
  ExpertiseStatus,
  ProfileData,
  ProfileExpertiseCategory,
  subcategoryStatus,
} from "@/types/profile";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout, hardReset } = useAuth();
  const { reset: resetOnboarding } = useOnboarding();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editVisible, setEditVisible] = useState(false);

  const load = async (opts?: { silent?: boolean }) => {
    if (opts?.silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const p = await fetchProfile();
      setProfile(p);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Couldn't load your profile.",
      );
    } finally {
      if (opts?.silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleLogout = () => logout();

  const handleResetTestData = () => {
    Alert.alert(
      "Reset test data?",
      "This clears every mock account and onboarding draft on this device. You'll be signed out.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            resetOnboarding();
            await hardReset();
          },
        },
      ],
    );
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background, paddingHorizontal: 32 },
        ]}
      >
        <Feather name="wifi-off" size={32} color={colors.mutedForeground} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Couldn't load your profile
        </Text>
        <Text style={[styles.errorBody, { color: colors.mutedForeground }]}>
          {error}
        </Text>
        <Pressable
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={() => load()}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const photoUri = absoluteUrl(profile.photoUrl);
  // The worker only ever picks one role during onboarding — only show that
  // category here, not the other 7 the account isn't set up for. We prefer the
  // category the backend flags `active`, but fall back to whichever category
  // actually holds skills (active/pending/rejected), and finally to the sole
  // category if there's just one — so a backend glitch that drops the
  // category-level `active` flag can't wipe the whole section.
  const myCategory =
    profile.expertise.find((cat) => cat.active) ??
    profile.expertise.find((cat) =>
      cat.subcategories.some((s) => subcategoryStatus(s) !== "none"),
    ) ??
    (profile.expertise.length === 1 ? profile.expertise[0] : null);

  const settings = [
    {
      icon: "map-pin",
      label: "Service Area",
      value: profile.account.serviceArea,
    },
    { icon: "phone", label: "Phone", value: profile.account.phone },
    { icon: "help-circle", label: "Help & Support", value: "" },
    { icon: "file-text", label: "Terms & Privacy", value: "" },
    { icon: "star", label: "Rate the App", value: "" },
    ...(__DEV__
      ? [
          {
            icon: "refresh-ccw",
            label: "Reset Test Data",
            value: "",
            dev: true,
            onPress: handleResetTestData,
          },
        ]
      : []),
  ] as {
    icon: string;
    label: string;
    value: string;
    dev?: boolean;
    onPress?: () => void;
  }[];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        <Pressable
          style={[styles.editBtn, { borderColor: colors.border }]}
          onPress={() => setEditVisible(true)}
        >
          <Feather name="edit-2" size={16} color={colors.text} />
          <Text style={[styles.editLabel, { color: colors.text }]}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 128 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ silent: true })}
            tintColor={colors.primary}
          />
        }
      >
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatarLarge} />
          ) : (
            <View
              style={[
                styles.avatarLarge,
                styles.avatarFallback,
                { backgroundColor: colors.accent },
              ]}
            >
              <Text style={[styles.avatarLargeText, { color: colors.primary }]}>
                {profile.displayInitial}
              </Text>
            </View>
          )}
          <Text style={[styles.workerName, { color: colors.text }]}>
            {profile.fullName}
          </Text>
          <Text style={[styles.workerCity, { color: colors.mutedForeground }]}>
            {profile.city}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Feather name="star" size={13} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                {profile.rating != null ? `${profile.rating} Rating` : "New"}
              </Text>
            </View>
            <View
              style={[styles.badge, { backgroundColor: colors.successLight }]}
            >
              <Feather name="check-circle" size={13} color={colors.success} />
              <Text style={[styles.badgeText, { color: colors.success }]}>
                {profile.jobsCompleted} Jobs Done
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          My Expertise
        </Text>
        {myCategory ? (
          <MyExpertiseSection
            profile={profile}
            category={myCategory}
            onProfileChange={setProfile}
          />
        ) : (
          <Text
            style={[
              styles.sectionSub,
              { color: colors.mutedForeground, marginBottom: 24 },
            ]}
          >
            No expertise selected yet.
          </Text>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Account
        </Text>
        <View
          style={[
            styles.settingsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {settings.map((item, i) => (
            <Pressable
              key={item.label}
              style={[
                styles.settingsRow,
                i < settings.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={item.onPress}
            >
              <View
                style={[
                  styles.settingsIcon,
                  {
                    backgroundColor: item.dev
                      ? colors.warningLight
                      : colors.secondary,
                  },
                ]}
              >
                <Feather
                  name={item.icon as any}
                  size={16}
                  color={item.dev ? colors.warning : colors.text}
                />
              </View>
              <Text
                style={[
                  styles.settingsLabel,
                  { color: item.dev ? colors.warning : colors.text },
                ]}
              >
                {item.label}
              </Text>
              {item.value ? (
                <Text
                  style={[
                    styles.settingsValue,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {item.value}
                </Text>
              ) : null}
              {!item.dev && (
                <Feather
                  name="chevron-right"
                  size={16}
                  color={colors.mutedForeground}
                />
              )}
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Appearance
        </Text>
        <ThemeToggleCard />

        <Pressable
          style={[styles.logoutBtn, { borderColor: colors.destructive }]}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>
            Log Out
          </Text>
        </Pressable>
      </ScrollView>

      <EditProfileModal
        visible={editVisible}
        profile={profile}
        onClose={() => setEditVisible(false)}
        onSaved={setProfile}
      />
    </View>
  );
}

/**
 * Shows the worker's one chosen category (e.g. "Cleaning") and its
 * sub-services. Specializations that are already approved show as active;
 * adding a new one is gated behind a demonstration video that our team
 * reviews (AddSpecializationModal) — so tapping an unheld specialization opens
 * the upload flow rather than toggling it on immediately. Approved skills can
 * still be removed directly.
 */
function MyExpertiseSection({
  profile,
  category,
  onProfileChange,
}: {
  profile: ProfileData;
  category: ProfileExpertiseCategory;
  onProfileChange: (p: ProfileData) => void;
}) {
  const colors = useColors();
  const meta = getServiceById(category.category);
  const [addSub, setAddSub] = useState<{ key: string; name: string } | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCount = category.subcategories.filter(
    (s) => subcategoryStatus(s) === "active",
  ).length;
  const pendingCount = category.subcategories.filter(
    (s) => subcategoryStatus(s) === "pending",
  ).length;
  const totalCount = category.subcategories.length;
  const progressPercent = totalCount > 0 ? (activeCount / totalCount) * 100 : 0;

  // Reflect a just-submitted video locally: the subcategory becomes `pending`
  // until the backend approves it. If the confirm call already returned the
  // updated profile we use that; otherwise we patch optimistically.
  const handleSubmitted = (updated: ProfileData | null, subKey: string) => {
    if (updated) {
      onProfileChange(updated);
    } else {
      onProfileChange({
        ...profile,
        expertise: profile.expertise.map((cat) =>
          cat.category !== category.category
            ? cat
            : {
                ...cat,
                subcategories: cat.subcategories.map((s) =>
                  s.key === subKey ? { ...s, status: "pending" as ExpertiseStatus } : s,
                ),
              },
        ),
      });
    }
  };

  const removeActive = (subKey: string, subName: string) => {
    Alert.alert(
      "Remove specialization?",
      `“${subName}” will no longer appear on your profile. You'll need to submit a new video to add it back.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setRemovingKey(subKey);
            setError(null);
            try {
              const remaining = category.subcategories
                .filter((s) => subcategoryStatus(s) === "active" && s.key !== subKey)
                .map((s) => s.key);
              const payload = remaining.length
                ? [{ category: category.category, subcategories: remaining }]
                : [];
              const updated = await updateExpertise(payload);
              onProfileChange(updated);
            } catch (e) {
              setError(
                e instanceof ApiError
                  ? e.message
                  : "Couldn't remove that specialization. Please try again.",
              );
            } finally {
              setRemovingKey(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.expSection}>
      <View
        style={[
          styles.premiumCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.premiumHeader}>
          <View style={[styles.premiumIconWrap, { backgroundColor: colors.accent }]}>
            <Feather
              name={(meta?.icon ?? "grid") as any}
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={styles.premiumHeaderTextWrap}>
            <Text style={[styles.premiumHeaderTitle, { color: colors.text }]}>
              {category.name}
            </Text>
            <Text style={[styles.premiumHeaderSubtitle, { color: colors.mutedForeground }]}>
              {activeCount} of {totalCount} skills active
              {pendingCount > 0 ? ` · ${pendingCount} in review` : ""}
            </Text>
          </View>
          <View style={[styles.premiumBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.premiumBadgeText, { color: colors.primary }]}>
              {Math.round(progressPercent)}%
            </Text>
          </View>
        </View>

        <View style={[styles.premiumDivider, { backgroundColor: colors.border }]} />

        <View style={styles.premiumBody}>
          <Text style={[styles.premiumListLabel, { color: colors.text }]}>
            Specializations
          </Text>
          <Text style={[styles.premiumListSublabel, { color: colors.mutedForeground }]}>
            Add a new skill by uploading a short video of you doing it — our team
            reviews it before it goes live.
          </Text>

          <View style={styles.servicesList}>
            {category.subcategories.map((sub, index) => {
              const status = subcategoryStatus(sub);
              const isLast = index === category.subcategories.length - 1;
              const removing = removingKey === sub.key;
              const canAdd = status === "none" || status === "rejected";

              return (
                <Pressable
                  key={sub.key}
                  onPress={
                    canAdd && !removing
                      ? () => setAddSub({ key: sub.key, name: sub.name })
                      : undefined
                  }
                  style={[
                    styles.serviceRow,
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.serviceRowText,
                      {
                        color: status === "active" ? colors.text : colors.mutedForeground,
                        fontFamily:
                          status === "active" ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {sub.name}
                  </Text>

                  {removing ? (
                    <ActivityIndicator size="small" color={colors.mutedForeground} />
                  ) : status === "active" ? (
                    <View style={styles.rowAccessory}>
                      <Feather name="check-circle" size={18} color={colors.success} />
                      <Pressable
                        onPress={() => removeActive(sub.key, sub.name)}
                        hitSlop={10}
                        style={styles.removeBtn}
                      >
                        <Feather name="x" size={16} color={colors.mutedForeground} />
                      </Pressable>
                    </View>
                  ) : status === "pending" ? (
                    <View style={[styles.statusPill, { backgroundColor: colors.warningLight }]}>
                      <Feather name="clock" size={12} color={colors.warning} />
                      <Text style={[styles.statusPillText, { color: colors.warning }]}>
                        In review
                      </Text>
                    </View>
                  ) : status === "rejected" ? (
                    <View style={[styles.statusPill, { backgroundColor: colors.accent }]}>
                      <Feather name="rotate-ccw" size={12} color={colors.primary} />
                      <Text style={[styles.statusPillText, { color: colors.primary }]}>
                        Retry
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.statusPill, { backgroundColor: colors.accent }]}>
                      <Feather name="plus" size={12} color={colors.primary} />
                      <Text style={[styles.statusPillText, { color: colors.primary }]}>Add</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {error && (
          <View style={styles.premiumErrorWrap}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[styles.premiumError, { color: colors.destructive }]}>{error}</Text>
          </View>
        )}
      </View>

      <AddSpecializationModal
        visible={!!addSub}
        categoryId={category.category}
        categoryName={category.name}
        subcategory={addSub}
        onClose={() => setAddSub(null)}
        onSubmitted={handleSubmitted}
      />
    </View>
  );
}

/**
 * A polished three-option toggle card for switching between Light, Dark, and
 * System appearance modes. Uses the ThemeContext to persist the user's choice.
 */
function ThemeToggleCard() {
  const colors = useColors();
  const { mode, setMode, colorScheme } = useTheme();

  const options: { id: ThemeMode; label: string; icon: string }[] = [
    { id: "light", label: "Light", icon: "sun" },
    { id: "dark", label: "Dark", icon: "moon" },
    { id: "system", label: "System", icon: "smartphone" },
  ];

  return (
    <View
      style={[
        styles.themeCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.themeHeader}>
        <View style={[styles.themeIconWrap, { backgroundColor: colors.accent }]}>
          <Feather
            name={colorScheme === "dark" ? "moon" : "sun"}
            size={20}
            color={colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.themeTitle, { color: colors.text }]}>Theme</Text>
          <Text style={[styles.themeSub, { color: colors.mutedForeground }]}>
            {mode === "system"
              ? `System (${colorScheme === "dark" ? "Dark" : "Light"})`
              : mode === "dark"
                ? "Dark Mode"
                : "Light Mode"}
          </Text>
        </View>
      </View>

      <View style={[styles.themeOptions, { backgroundColor: colors.secondary }]}>
        {options.map((opt) => {
          const active = mode === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={[
                styles.themeOption,
                active && {
                  backgroundColor: colors.card,
                  ...Platform.select({
                    ios: {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                    },
                    android: { elevation: 2 },
                  }),
                },
              ]}
              onPress={() => setMode(opt.id)}
            >
              <Feather
                name={opt.icon as any}
                size={15}
                color={active ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.themeOptionText,
                  {
                    color: active ? colors.primary : colors.mutedForeground,
                    fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function EditProfileModal({
  visible,
  profile,
  onClose,
  onSaved,
}: {
  visible: boolean;
  profile: ProfileData;
  onClose: () => void;
  onSaved: (p: ProfileData) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState(profile.fullName);
  const [city, setCity] = useState(profile.city);
  const [cities, setCities] = useState<string[]>([]);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string | undefined>(
    undefined,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setFullName(profile.fullName);
    setCity(profile.city);
    setPhotoUri(null);
    setPhotoMimeType(undefined);
    setError(null);
    fetchCities()
      .then(setCities)
      .catch(() => {});
  }, [visible, profile]);

  const captureFrom = async (source: "camera" | "library") => {
    const perm =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            mediaTypes: ["images"],
          });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoMimeType(result.assets[0].mimeType);
    }
  };

  const pickPhoto = () => {
    Alert.alert("Change Profile Photo", undefined, [
      { text: "Take Photo", onPress: () => captureFrom("camera") },
      { text: "Choose from Library", onPress: () => captureFrom("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const hasChanges =
    fullName.trim() !== profile.fullName || city !== profile.city || !!photoUri;
  const canSave = hasChanges && fullName.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile({
        fullName:
          fullName.trim() !== profile.fullName ? fullName.trim() : undefined,
        city: city !== profile.city ? city : undefined,
        photoUri: photoUri ?? undefined,
        photoMimeType,
      });
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Couldn't save changes. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const previewUri = photoUri ?? absoluteUrl(profile.photoUrl);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View
        style={[
          styles.modalSheet,
          { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View
          style={[styles.modalHandle, { backgroundColor: colors.border }]}
        />
        <View style={styles.modalHeaderRow}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Edit Profile
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Pressable style={styles.modalAvatarWrap} onPress={pickPhoto}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.modalAvatar} />
          ) : (
            <View
              style={[
                styles.modalAvatar,
                styles.avatarFallback,
                { backgroundColor: colors.accent },
              ]}
            >
              <Text
                style={[styles.modalAvatarInitial, { color: colors.primary }]}
              >
                {profile.displayInitial}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.modalAvatarEditBadge,
              { backgroundColor: colors.primary, borderColor: colors.card },
            ]}
          >
            <Feather name="camera" size={13} color="#fff" />
          </View>
        </Pressable>

        <View style={styles.modalField}>
          <Text style={[styles.modalLabel, { color: colors.text }]}>
            Full Name
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.input,
                color: colors.text,
              },
            ]}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.modalField}>
          <Text style={[styles.modalLabel, { color: colors.text }]}>
            Service Area (City)
          </Text>
          <Pressable
            style={[
              styles.modalSelect,
              { backgroundColor: colors.background, borderColor: colors.input },
            ]}
            onPress={() => setCityPickerOpen(true)}
          >
            <Text style={[styles.modalSelectText, { color: colors.text }]}>
              {city}
            </Text>
            <Feather
              name="chevron-down"
              size={16}
              color={colors.mutedForeground}
            />
          </Pressable>
        </View>

        {error && (
          <Text style={[styles.modalError, { color: colors.destructive }]}>
            {error}
          </Text>
        )}

        <Pressable
          style={[
            styles.modalSaveBtn,
            { backgroundColor: colors.primary, opacity: canSave ? 1 : 0.5 },
          ]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.modalSaveText}>Save Changes</Text>
          )}
        </Pressable>
      </View>

      <PickerModal
        visible={cityPickerOpen}
        title="Select City"
        options={cities.map((c) => ({ label: c, value: c }))}
        onSelect={setCity}
        onClose={() => setCityPickerOpen(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  errorTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 8 },
  errorBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  scroll: { padding: 20, gap: 0 },
  profileCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  avatarLarge: { width: 72, height: 72, borderRadius: 36, marginBottom: 6 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLargeText: { fontSize: 30, fontFamily: "Inter_700Bold" },
  workerName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  workerCity: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 8 },
  badgeRow: { flexDirection: "row", gap: 10 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 14,
  },
  expSection: { marginBottom: 24, marginTop: 8 },
  premiumCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  premiumHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  premiumIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumHeaderTextWrap: { flex: 1 },
  premiumHeaderTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 4 },
  premiumHeaderSubtitle: { fontSize: 13, fontFamily: "Inter_500Medium" },
  premiumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  premiumBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  premiumDivider: { height: 1, width: "100%" },
  premiumBody: { padding: 20 },
  premiumListLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  premiumListSublabel: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16 },
  servicesList: {
    marginTop: 4,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  serviceRowText: {
    fontSize: 15,
    flex: 1,
    paddingRight: 12,
  },
  rowAccessory: { flexDirection: "row", alignItems: "center", gap: 10 },
  removeBtn: { padding: 2 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusPillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  premiumErrorWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  premiumError: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  settingsIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  settingsValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  themeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  themeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  themeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  themeTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  themeSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  themeOptions: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  themeOptionText: { fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 10,
    gap: 18,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center" },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalAvatarWrap: { alignSelf: "center" },
  modalAvatar: { width: 84, height: 84, borderRadius: 42 },
  modalAvatarInitial: { fontSize: 32, fontFamily: "Inter_700Bold" },
  modalAvatarEditBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  modalField: { gap: 8 },
  modalLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  modalSelect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  modalSelectText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  modalError: {
    fontSize: 12.5,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  modalSaveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
