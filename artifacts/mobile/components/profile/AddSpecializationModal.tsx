import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  extensionOf,
  formatBytes,
  formatDuration,
  validateVideo,
  VIDEO_LIMITS,
  VIDEO_TIPS,
} from "@/constants/videoTask";
import { useColors } from "@/hooks/useColors";
import { ApiError } from "@/services/apiClient";
import { submitExpertiseVideo } from "@/services/profileApi";
import { ProfileData } from "@/types/profile";

interface SelectedVideo {
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
  durationSeconds: number | null;
}

type Phase = "pick" | "uploading" | "done";

/**
 * Bottom-sheet flow for adding a new specialization. The worker records a video
 * demonstrating the skill (outside the app), picks it here, and submits it for
 * review. On success the specialization enters a `pending` state until a
 * reviewer approves it — it is NOT added immediately.
 */
export function AddSpecializationModal({
  visible,
  categoryId,
  categoryName,
  subcategory,
  onClose,
  onSubmitted,
}: {
  visible: boolean;
  categoryId: string;
  categoryName: string;
  subcategory: { key: string; name: string } | null;
  onClose: () => void;
  onSubmitted: (profile: ProfileData | null, subcategoryKey: string) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>("pick");
  const [video, setVideo] = useState<SelectedVideo | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPhase("pick");
      setVideo(null);
      setProgress(0);
      setError(null);
    }
  }, [visible]);

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Gallery access needed",
        "Please allow gallery access in Settings so you can upload your demonstration video.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: VIDEO_LIMITS.maxDurationSeconds,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    let sizeBytes: number | null = asset.fileSize ?? null;
    try {
      const info = await FileSystem.getInfoAsync(asset.uri);
      if (info.exists) sizeBytes = info.size;
    } catch {
      /* keep fallback */
    }

    const durationSeconds = asset.duration != null ? asset.duration / 1000 : null;
    const fileName = asset.fileName ?? asset.uri.split("/").pop() ?? "specialization.mp4";
    const mimeType =
      asset.mimeType ?? (extensionOf(fileName) === "mov" ? "video/quicktime" : "video/mp4");

    const check = validateVideo({ uri: asset.uri, fileName, mimeType, sizeBytes, durationSeconds });
    if (!check.ok) {
      setError(check.message ?? "Invalid video.");
      return;
    }

    setError(null);
    setVideo({ uri: asset.uri, fileName, mimeType, sizeBytes, durationSeconds });
  };

  const submit = async () => {
    if (!video || !subcategory) return;
    setPhase("uploading");
    setProgress(0);
    setError(null);
    try {
      const { profile } = await submitExpertiseVideo({
        category: categoryId,
        subcategory: subcategory.key,
        fileUri: video.uri,
        fileName: video.fileName,
        mimeType: video.mimeType,
        fileSize: video.sizeBytes ?? 0,
        durationSeconds: video.durationSeconds ?? 0,
        onProgress: setProgress,
      });
      setPhase("done");
      onSubmitted(profile, subcategory.key);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't submit your video. Please try again.");
      setPhase("pick");
    }
  };

  const pct = Math.round(progress * 100);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={phase === "uploading" ? undefined : onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Add specialization</Text>
          {phase !== "uploading" && (
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {phase === "done" ? (
          <View style={styles.doneWrap}>
            <View style={[styles.doneBadge, { backgroundColor: colors.successLight }]}>
              <View style={[styles.doneBadgeInner, { backgroundColor: colors.success }]}>
                <Feather name="check" size={26} color="#fff" />
              </View>
            </View>
            <Text style={[styles.doneTitle, { color: colors.text }]}>Submitted for review</Text>
            <Text style={[styles.doneText, { color: colors.mutedForeground }]}>
              We'll review your video for “{subcategory?.name}” and add it to your profile once it's
              approved. This usually takes up to 24 hours.
            </Text>
            <Pressable
              style={[styles.primaryBtn, styles.doneBtn, { backgroundColor: colors.primary }]}
              onPress={onClose}
            >
              <Text style={styles.primaryBtnText}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.chip, { backgroundColor: colors.accent }]}>
              <Feather name="award" size={14} color={colors.primary} />
              <Text style={[styles.chipText, { color: colors.primary }]}>
                {categoryName} · {subcategory?.name}
              </Text>
            </View>

            <Text style={[styles.desc, { color: colors.mutedForeground }]}>
              Record a 1–3 minute video of yourself doing “{subcategory?.name}” from start to finish,
              then upload it here for our team to review.
            </Text>

            <View style={[styles.tips, { backgroundColor: colors.background, borderColor: colors.border }]}>
              {VIDEO_TIPS.map((tip) => (
                <View key={tip} style={styles.tipRow}>
                  <Feather name="check" size={13} color={colors.primary} style={{ marginTop: 2 }} />
                  <Text style={[styles.tipText, { color: colors.text }]}>{tip}</Text>
                </View>
              ))}
            </View>

            {video ? (
              <View style={[styles.fileRow, { borderColor: colors.border }]}>
                <View style={[styles.thumb, { backgroundColor: colors.secondary }]}>
                  <Feather name="video" size={20} color={colors.secondaryForeground} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    style={[styles.fileName, { color: colors.text }]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {video.fileName}
                  </Text>
                  <Text style={[styles.fileMeta, { color: colors.mutedForeground }]}>
                    {video.sizeBytes != null ? formatBytes(video.sizeBytes) : "—"}
                    {video.durationSeconds != null ? ` · ${formatDuration(video.durationSeconds)}` : ""}
                  </Text>
                </View>
                {phase === "pick" && (
                  <Pressable onPress={pickVideo} hitSlop={8}>
                    <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </View>
            ) : (
              <Pressable
                onPress={pickVideo}
                style={[styles.selectBtn, { borderColor: colors.primary }]}
              >
                <Feather name="upload" size={16} color={colors.primary} />
                <Text style={[styles.selectBtnText, { color: colors.primary }]}>Select video</Text>
              </Pressable>
            )}

            {phase === "uploading" && (
              <View style={styles.progressWrap}>
                <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
                  <View
                    style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.primary }]}
                  />
                </View>
                <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                  Uploading… {pct}%
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            )}

            <Pressable
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, opacity: !video || phase === "uploading" ? 0.5 : 1 },
              ]}
              onPress={submit}
              disabled={!video || phase === "uploading"}
            >
              {phase === "uploading" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Submit for review</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 10,
    gap: 16,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 20 },
  tips: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 9 },
  tipRow: { flexDirection: "row", gap: 9, alignItems: "flex-start" },
  tipText: { flex: 1, fontSize: 12.5, fontFamily: "Inter_500Medium", lineHeight: 18 },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  selectBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  thumb: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  fileName: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  fileMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressWrap: { gap: 6 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressLabel: { fontSize: 11.5, fontFamily: "Inter_500Medium" },
  errorRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  errorText: { flex: 1, fontSize: 12.5, fontFamily: "Inter_500Medium", lineHeight: 17 },
  primaryBtn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  doneWrap: { alignItems: "center", paddingTop: 16, paddingBottom: 4 },
  doneBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  doneBadgeInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 8 },
  doneText: {
    fontSize: 13.5,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  doneBtn: { alignSelf: "stretch" },
});
