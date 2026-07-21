import { TaskNumber } from "@/constants/videoTask";
import { api, uploadFileToUrl } from "@/services/apiClient";
import { normalizePresign } from "@/services/videoUpload";

/**
 * Practical video task API (see the onboarding video-task integration brief).
 *
 * Upload is a 3-step presigned-URL flow so the video goes phone -> S3 directly,
 * never through our EC2 server:
 *   1. presigned-url  -> we ask the backend for a short-lived PUT URL + S3 key
 *   2. PUT to S3      -> stream the file straight to the bucket
 *   3. confirm-upload -> backend verifies via headObject and records it
 *
 * Note: unlike the brief's sample payloads, these routes carry NO workerId —
 * the worker is resolved from the bearer token, matching every other
 * /api/onboarding/* route in this app. The server owns the S3 key path.
 */

export interface PresignedUrlResponse {
  /** Short-lived S3 PUT URL (expires ~15 min). Never persisted server-side. */
  url: string;
  /** The object key the backend chose; echo it back on confirm. */
  s3Key: string;
  expiresInSeconds?: number;
}

export async function getVideoPresignedUrl(input: {
  taskNumber: TaskNumber;
  fileName: string;
  fileType: string; // video/mp4 | video/quicktime
  fileSize: number; // bytes
}): Promise<PresignedUrlResponse> {
  const raw = await api.post<Record<string, any>>(
    "/api/worker/onboarding/video/presigned-url",
    { json: input }
  );
  const norm = normalizePresign(raw);
  return { url: norm.url, s3Key: norm.s3Key ?? "", expiresInSeconds: norm.expiresInSeconds };
}

export interface ConfirmUploadResponse {
  /** True once both task videos are confirmed for this worker. */
  bothUploaded: boolean;
  onboardingStep?: string;
}

export const confirmVideoUpload = (input: {
  taskNumber: TaskNumber;
  s3Key: string;
  durationSeconds: number;
  fileSize: number;
}) =>
  api.post<ConfirmUploadResponse>("/api/worker/onboarding/video/confirm-upload", { json: input });

export type ServerVideoStatus =
  | "not-started"
  | "pending"
  | "uploaded"
  | "under-review"
  | "approved"
  | "rejected";

export interface VideoTaskStatusItem {
  status: ServerVideoStatus;
  thumbnailUrl?: string | null;
}

/** Used on screen load to restore state after an interrupted/closed session. */
export const fetchVideoTaskStatus = () =>
  api.get<{ task1: VideoTaskStatusItem; task2: VideoTaskStatusItem }>(
    "/api/worker/onboarding/video/status"
  );

/**
 * Runs the full presign -> PUT -> confirm flow for one task video, reporting
 * upload progress (0..1) along the way. Throws ApiError on any step so the
 * caller can show a per-video retry.
 */
export async function submitPracticalVideo(params: {
  taskNumber: TaskNumber;
  fileUri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  durationSeconds: number;
  onProgress?: (fraction: number) => void;
}): Promise<{ s3Key: string; bothUploaded: boolean; onboardingStep?: string }> {
  const { url, s3Key } = await getVideoPresignedUrl({
    taskNumber: params.taskNumber,
    fileName: params.fileName,
    fileType: params.mimeType,
    fileSize: params.fileSize,
  });

  if (__DEV__) {
    // The host here must be reachable FROM THE PHONE. A localhost/127.0.0.1/
    // private-IP/Docker-name host explains a transport failure on the PUT.
    console.log(`[video] presigned PUT url for task ${params.taskNumber}: ${url}`);
  }

  await uploadFileToUrl(url, {
    fileUri: params.fileUri,
    contentType: params.mimeType,
    onProgress: params.onProgress,
  });

  const confirm = await confirmVideoUpload({
    taskNumber: params.taskNumber,
    s3Key,
    durationSeconds: Math.round(params.durationSeconds),
    fileSize: params.fileSize,
  });

  return { s3Key, bothUploaded: confirm.bothUploaded, onboardingStep: confirm.onboardingStep };
}
