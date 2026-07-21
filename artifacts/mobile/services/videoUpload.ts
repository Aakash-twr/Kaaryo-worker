import { ApiError, uploadFileToUrl } from "@/services/apiClient";

/**
 * Shared helpers for the "upload a video to S3 via a presigned URL" flow, used
 * by both onboarding (practical task) and the profile (add specialization).
 */

export interface PresignResult {
  /** The S3 PUT url the phone uploads to. Must be reachable from the device. */
  url: string;
  /** The object key to echo back on confirm. */
  s3Key: string | undefined;
  expiresInSeconds?: number;
}

/**
 * Pulls the presigned PUT url + object key out of a backend response,
 * regardless of field naming or a `data` wrapper. Backends vary
 * (url/uploadUrl/presignedUrl/signedUrl, key/s3Key/objectKey), and handing an
 * `undefined` url to the native uploader crashes it — so we fail loudly with a
 * clear message instead.
 */
export function normalizePresign(raw: Record<string, any> | null | undefined): PresignResult {
  const src = raw?.data ?? raw ?? {};
  const url = src.url ?? src.uploadUrl ?? src.presignedUrl ?? src.signedUrl ?? src.putUrl;
  const s3Key = src.s3Key ?? src.key ?? src.objectKey ?? src.Key;

  if (typeof url !== "string" || !url) {
    if (__DEV__) {
      console.log("[video] presign response had no recognizable url field:", JSON.stringify(raw));
    }
    throw new ApiError("The server didn't return an upload link. Please try again.", 0, raw);
  }

  return { url, s3Key, expiresInSeconds: src.expiresInSeconds ?? src.expiresIn };
}

export { uploadFileToUrl };
