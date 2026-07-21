import { WorkerRole } from "@/constants/onboarding";

/**
 * Config + client-side validation for the practical video task step of
 * onboarding. The worker records two short videos outside the app, then
 * uploads them from their gallery. Every limit here MUST be mirrored on the
 * server when it signs the S3 presigned URL — the client check is only a
 * fast-fail UX, never the security boundary.
 */

export type TaskNumber = 1 | 2;

export interface PracticalTask {
  number: TaskNumber;
  title: string;
  description: string;
}

export const VIDEO_LIMITS = {
  maxSizeBytes: 200 * 1024 * 1024, // 200 MB
  minDurationSeconds: 30,
  maxDurationSeconds: 180, // 3 minutes
  allowedExtensions: ["mp4", "mov"] as const,
  // video/quicktime is the standard MIME for .mov captured on iOS.
  allowedMimeTypes: ["video/mp4", "video/quicktime"] as const,
};

/**
 * The worker must spend at least this long on the instructions screen before
 * the "proceed to upload" button unlocks, so they actually read the tasks.
 */
export const INSTRUCTIONS_MIN_READ_SECONDS = 10;

export const DURATION_HINT = "Video should be between 1 and 3 minutes.";

export const VIDEO_TIPS: string[] = [
  "Record in good lighting.",
  "Make sure your face and hands are visible.",
  "Speak naturally if you want to explain what you are doing.",
  "Do not send a video recorded by someone else.",
];

/**
 * Two practical tasks per role. Cleaning is specified verbatim from the
 * onboarding brief; cooking/electrical mirror the same "show the full process
 * start to finish" structure so the reviewer can judge real hands-on skill.
 */
const TASKS_BY_ROLE: Record<WorkerRole, [PracticalTask, PracticalTask]> = {
  cleaning: [
    {
      number: 1,
      title: "Mopping a floor",
      description:
        "Record a video of yourself mopping a floor. Show the full process from start to finish. Use any mop or cloth available at home.",
    },
    {
      number: 2,
      title: "Cleaning a bathroom sink",
      description:
        "Record a video of yourself cleaning a bathroom sink. Show how you apply the cleaner, scrub, and rinse.",
    },
  ],
  cooking: [
    {
      number: 1,
      title: "Preparing a simple dish",
      description:
        "Record a video of yourself preparing a simple dish of your choice. Show the full process from prep to plating.",
    },
    {
      number: 2,
      title: "Kitchen hygiene & cleanup",
      description:
        "Record a video showing how you clean your workstation and wash up after cooking. Show your hygiene routine clearly.",
    },
  ],
  electrical: [
    {
      number: 1,
      title: "Wiring a switch or socket",
      description:
        "Record a video of yourself wiring or repairing a switch/socket. Show the full process and how you check it safely.",
    },
    {
      number: 2,
      title: "Installing a fan or light",
      description:
        "Record a video of yourself installing or repairing a fan or light fixture from start to finish.",
    },
  ],
};

export function tasksForRole(role: WorkerRole | null): [PracticalTask, PracticalTask] {
  return TASKS_BY_ROLE[role ?? "cleaning"];
}

// --- validation ------------------------------------------------------------

export interface VideoValidationInput {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
}

export interface VideoValidationResult {
  ok: boolean;
  message?: string;
}

/** Lower-cased file extension of a URI/filename, without the dot. */
export function extensionOf(uriOrName: string): string {
  return uriOrName.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

/**
 * Validates a selected video against size / duration / type limits. Returns
 * the first failure with a worker-friendly message, or `{ ok: true }`.
 */
export function validateVideo(input: VideoValidationInput): VideoValidationResult {
  const ext = extensionOf(input.fileName || input.uri);
  const extOk = (VIDEO_LIMITS.allowedExtensions as readonly string[]).includes(ext);
  const mimeOk =
    !input.mimeType ||
    (VIDEO_LIMITS.allowedMimeTypes as readonly string[]).includes(input.mimeType);
  if (!extOk && !mimeOk) {
    return { ok: false, message: "Only MP4 and MOV videos are allowed. Please record with your phone camera." };
  }

  if (input.sizeBytes != null && input.sizeBytes > VIDEO_LIMITS.maxSizeBytes) {
    return {
      ok: false,
      message: "This video is too large. Please compress it or record a shorter video and try again.",
    };
  }

  if (input.durationSeconds != null) {
    if (input.durationSeconds < VIDEO_LIMITS.minDurationSeconds) {
      return { ok: false, message: "Video is too short. Please record at least 30 seconds." };
    }
    if (input.durationSeconds > VIDEO_LIMITS.maxDurationSeconds) {
      return { ok: false, message: "Video is too long. Please keep it under 3 minutes." };
    }
  }

  return { ok: true };
}
