import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FooterButton } from "@/components/onboarding/FooterButton";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import {
  extensionOf,
  formatBytes,
  formatDuration,
  PracticalTask,
  TaskNumber,
  tasksForRole,
  validateVideo,
  VIDEO_LIMITS,
} from "@/constants/videoTask";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useColors } from "@/hooks/useColors";
import { ApiError } from "@/services/apiClient";
import {
  fetchVideoTaskStatus,
  submitPracticalVideo,
  VideoTaskStatusItem,
} from "@/services/videoTaskApi";
import {
  createEmptyPracticalVideo,
  PracticalVideoState,
} from "@/types/onboarding";

interface CardState extends PracticalVideoState {
  progress: number; // 0..1, only meaningful while uploading
  error: string | null;
}

const toCard = (v: PracticalVideoState): CardState => ({
  ...v,
  progress: v.status === "uploaded" ? 1 : 0,
  error: null,
});

// Only the durable subset is written back to the onboarding draft (progress /
// error are transient). While uploading we persist as "selected" so a resume
// re-offers the upload rather than claiming it finished.
const toDurable = (c: CardState): PracticalVideoState => ({
  localUri: c.localUri,
  fileName: c.fileName,
  mimeType: c.mimeType,
  sizeBytes: c.sizeBytes,
  durationSeconds: c.durationSeconds,
  s3Key: c.s3Key,
  status: c.status === "uploading" ? "selected" : c.status,
});

const DRAFT_KEY: Record<TaskNumber, "practicalVideoTask1" | "practicalVideoTask2"> = {
  1: "practicalVideoTask1",
  2: "practicalVideoTask2",
};

/**
 * Step 6b — pick each recorded video from the gallery, validate it locally,
 * then upload both straight to S3 via presigned URLs. Selection, progress and
 * confirmed state persist to the onboarding draft so an interrupted or
 * backgrounded upload resumes without re-selecting finished videos.
 */
export default function VideoUploadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, updateData, setLastRoute } = useOnboarding();
  const { setOnboardingStep } = useAuth();

  const tasks = tasksForRole(data.role);
  const [cards, setCards] = useState<Record<TaskNumber, CardState>>({
    1: toCard(data.practicalVideoTask1),
    2: toCard(data.practicalVideoTask2),
  });
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cardsRef = useRef(cards);
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  const persistDurable = (n: TaskNumber, card: CardState) =>
    updateData({ [DRAFT_KEY[n]]: toDurable(card) } as any);

  const setCard = (n: TaskNumber, card: CardState) =>
    setCards((prev) => ({ ...prev, [n]: card }));

  // On load, reconcile with the server so a worker resuming on a new device (or
  // after clearing the draft) sees videos they've already uploaded.
  useEffect(() => {
    (async () => {
      let status: { task1: VideoTaskStatusItem; task2: VideoTaskStatusItem };
      try {
        status = await fetchVideoTaskStatus();
      } catch {
        return; // offline / endpoint not ready — local draft is enough
      }
      const reconcile = (card: CardState, item?: VideoTaskStatusItem): CardState => {
        const done =
          item?.status === "uploaded" ||
          item?.status === "under-review" ||
          item?.status === "approved";
        if (done && card.status !== "uploaded") {
          return { ...card, status: "uploaded", progress: 1, error: null };
        }
        return card;
      };
      const base = cardsRef.current;
      const c1 = reconcile(base[1], status.task1);
      const c2 = reconcile(base[2], status.task2);
      setCards({ 1: c1, 2: c2 });
      if (c1 !== base[1]) persistDurable(1, c1);
      if (c2 !== base[2]) persistDurable(2, c2);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickVideo = async (n: TaskNumber) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Gallery access needed",
        "Please allow gallery access in Settings so you can upload your task videos.",
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
      /* keep asset.fileSize fallback */
    }

    const durationSeconds = asset.duration != null ? asset.duration / 1000 : null;
    const fileName = asset.fileName ?? asset.uri.split("/").pop() ?? `task${n}.mp4`;
    const mimeType =
      asset.mimeType ?? (extensionOf(fileName) === "mov" ? "video/quicktime" : "video/mp4");

    const check = validateVideo({ uri: asset.uri, fileName, mimeType, sizeBytes, durationSeconds });
    if (!check.ok) {
      // Keep whatever was selected before; just surface the rejection.
      setCards((prev) => ({ ...prev, [n]: { ...prev[n], error: check.message ?? "Invalid video." } }));
      return;
    }

    const card: CardState = {
      localUri: asset.uri,
      fileName,
      mimeType,
      sizeBytes,
      durationSeconds,
      s3Key: null,
      status: "selected",
      progress: 0,
      error: null,
    };
    setCard(n, card);
    persistDurable(n, card);
  };

  const removeVideo = (n: TaskNumber) => {
    const empty: CardState = { ...createEmptyPracticalVideo(), progress: 0, error: null };
    setCard(n, empty);
    persistDurable(n, empty);
  };

  // Uploads one task video; never throws — records a per-card failure instead.
  const uploadOne = async (n: TaskNumber): Promise<boolean> => {
    const c = cardsRef.current[n];
    if (
      !c.localUri ||
      !c.fileName ||
      !c.mimeType ||
      c.sizeBytes == null ||
      c.durationSeconds == null
    ) {
      return false;
    }

    setCard(n, { ...c, status: "uploading", progress: 0, error: null });
    try {
      const res = await submitPracticalVideo({
        taskNumber: n,
        fileUri: c.localUri,
        fileName: c.fileName,
        mimeType: c.mimeType,
        fileSize: c.sizeBytes,
        durationSeconds: c.durationSeconds,
        onProgress: (f) =>
          setCards((prev) => ({ ...prev, [n]: { ...prev[n], progress: f } })),
      });
      const done: CardState = {
        ...cardsRef.current[n],
        s3Key: res.s3Key,
        status: "uploaded",
        progress: 1,
        error: null,
      };
      setCard(n, done);
      persistDurable(n, done);
      if (res.onboardingStep) setOnboardingStep(res.onboardingStep);
      return true;
    } catch (e) {
      const failed: CardState = {
        ...cardsRef.current[n],
        status: "failed",
        error: e instanceof ApiError ? e.message : "Upload failed. Please try again.",
      };
      setCard(n, failed);
      persistDurable(n, failed);
      return false;
    }
  };

  const uploadPending = async () => {
    const targets = ([1, 2] as TaskNumber[]).filter((n) => {
      const s = cardsRef.current[n].status;
      return (s === "selected" || s === "failed") && !!cardsRef.current[n].localUri;
    });
    if (targets.length === 0) return;

    setBusy(true);
    setSubmitError(null);
    // Sequential upload is more reliable than parallel on flaky mobile networks.
    let anyFailed = false;
    for (const n of targets) {
      const ok = await uploadOne(n);
      if (!ok) anyFailed = true;
    }
    setBusy(false);
    if (anyFailed) {
      setSubmitError("Some videos didn't upload. Tap retry on the ones that failed.");
    }
  };

  const allUploaded = cards[1].status === "uploaded" && cards[2].status === "uploaded";
  const bothSelected =
    cards[1].status !== "not-started" && cards[2].status !== "not-started";
  const pendingCount = ([1, 2] as TaskNumber[]).filter(
    (n) => cards[n].status === "selected" || cards[n].status === "failed"
  ).length;
  const anyFailed = cards[1].status === "failed" || cards[2].status === "failed";

  // Stamp the submission time once both videos are confirmed.
  useEffect(() => {
    if (allUploaded && !data.practicalVideosSubmittedAt) {
      updateData({ practicalVideosSubmittedAt: new Date().toISOString() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allUploaded]);

  const proceed = () => {
    setLastRoute("references");
    router.push("/onboarding/references" as any);
  };

  const uploadLabel = anyFailed
    ? "Retry upload"
    : pendingCount > 1
    ? "Upload both videos"
    : "Upload video";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OnboardingProgress
        step={6}
        total={8}
        title="Upload your task videos"
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {allUploaded ? (
          <View style={[styles.doneCard, { backgroundColor: colors.successLight }]}>
            <View style={[styles.doneBadge, { backgroundColor: colors.success }]}>
              <Feather name="check" size={26} color="#fff" />
            </View>
            <Text style={[styles.doneTitle, { color: colors.text }]}>Videos submitted</Text>
            <Text style={[styles.doneText, { color: colors.mutedForeground }]}>
              Our team will review your videos within 24 hours. You can continue your application in
              the meantime.
            </Text>
          </View>
        ) : (
          <Text style={[styles.intro, { color: colors.mutedForeground }]}>
            Select the two videos you recorded from your gallery. We'll check each one before
            uploading it securely.
          </Text>
        )}

        {tasks.map((task) => (
          <UploadCard
            key={task.number}
            task={task}
            card={cards[task.number]}
            onSelect={() => pickVideo(task.number)}
            onRemove={() => removeVideo(task.number)}
            onRetry={() => uploadOne(task.number)}
            disabled={busy}
          />
        ))}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        {submitError && !allUploaded && (
          <Text style={[styles.apiError, { color: colors.destructive }]}>{submitError}</Text>
        )}
        {allUploaded ? (
          <FooterButton label="Continue" onPress={proceed} />
        ) : (
          <FooterButton
            label={uploadLabel}
            onPress={uploadPending}
            loading={busy}
            disabled={!bothSelected || pendingCount === 0}
          />
        )}
      </View>
    </View>
  );
}

function UploadCard({
  task,
  card,
  onSelect,
  onRemove,
  onRetry,
  disabled,
}: {
  task: PracticalTask;
  card: CardState;
  onSelect: () => void;
  onRemove: () => void;
  onRetry: () => void;
  disabled: boolean;
}) {
  const colors = useColors();
  const hasVideo = card.status !== "not-started" && !!card.localUri;
  const isUploading = card.status === "uploading";
  const isUploaded = card.status === "uploaded";
  const pct = Math.round(card.progress * 100);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Task {task.number}: {task.title}
        </Text>
        {isUploaded && (
          <View style={[styles.checkBadge, { backgroundColor: colors.success }]}>
            <Feather name="check" size={13} color="#fff" />
          </View>
        )}
      </View>

      {hasVideo ? (
        <View style={styles.selectedRow}>
          <View style={[styles.thumb, { backgroundColor: colors.secondary }]}>
            <Feather name="video" size={22} color={colors.secondaryForeground} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text
              style={[styles.fileName, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {card.fileName ?? "video"}
            </Text>
            <Text style={[styles.fileMeta, { color: colors.mutedForeground }]}>
              {card.sizeBytes != null ? formatBytes(card.sizeBytes) : "—"}
              {card.durationSeconds != null ? ` · ${formatDuration(card.durationSeconds)}` : ""}
            </Text>
          </View>
          {!isUploading && !isUploaded && (
            <Pressable onPress={onRemove} hitSlop={8} disabled={disabled}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable
          onPress={onSelect}
          disabled={disabled}
          style={[styles.selectBtn, { borderColor: colors.primary }]}
        >
          <Feather name="upload" size={16} color={colors.primary} />
          <Text style={[styles.selectBtnText, { color: colors.primary }]}>Select video</Text>
        </Pressable>
      )}

      {isUploading && (
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

      {card.error && (
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{card.error}</Text>
        </View>
      )}

      {card.status === "failed" && (
        <Pressable onPress={onRetry} disabled={disabled} style={styles.retryRow}>
          <Feather name="refresh-cw" size={14} color={colors.primary} />
          <Text style={[styles.retryText, { color: colors.primary }]}>Retry upload</Text>
        </Pressable>
      )}

      {(card.status === "selected" || card.status === "failed") && (
        <Pressable onPress={onSelect} disabled={disabled} hitSlop={6} style={styles.reselectRow}>
          <Text style={[styles.reselectText, { color: colors.mutedForeground }]}>
            Choose a different video
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, gap: 16 },
  intro: { fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 14 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { flex: 1, fontSize: 14.5, fontFamily: "Inter_700Bold" },
  checkBadge: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
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
  selectedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  thumb: { width: 52, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  fileName: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  fileMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressWrap: { gap: 6 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressLabel: { fontSize: 11.5, fontFamily: "Inter_500Medium" },
  errorRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  errorText: { flex: 1, fontSize: 12.5, fontFamily: "Inter_500Medium", lineHeight: 17 },
  retryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  retryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  reselectRow: { alignSelf: "flex-start" },
  reselectText: { fontSize: 12.5, fontFamily: "Inter_500Medium", textDecorationLine: "underline" },
  doneCard: { borderRadius: 16, padding: 20, alignItems: "center", gap: 8 },
  doneBadge: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  doneTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  doneText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  apiError: { fontSize: 12.5, fontFamily: "Inter_500Medium", textAlign: "center", marginBottom: 10 },
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
