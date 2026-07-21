import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import { API_BASE_URL } from "@/constants/config";

const TOKEN_KEY = "kaaryo_worker_token";

/**
 * Thrown for any non-2xx response OR a 2xx response whose envelope has
 * `success: false`. `payload` carries the full parsed body so callers can read
 * endpoint-specific extras (retryAllowed, attempts, confirmDetails, missing…).
 */
export class ApiError extends Error {
  status: number;
  payload: any;
  constructor(message: string, status: number, payload: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export async function loadAuthToken(): Promise<string | null> {
  authToken = await AsyncStorage.getItem(TOKEN_KEY);
  return authToken;
}

export async function setAuthToken(token: string | null): Promise<void> {
  authToken = token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export function getAuthToken(): string | null {
  return authToken;
}

/** Registered by AuthContext — fired once whenever any request returns 401. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT";
  /** JSON body — serialized and sent with application/json. */
  json?: unknown;
  /** Pre-built FormData — sent as multipart/form-data (Content-Type auto-set). */
  form?: FormData;
  /** Attach the bearer token. Default true; auth/places routes pass false. */
  auth?: boolean;
  query?: Record<string, string | number | undefined>;
  /** Overrides the default timeout (20s JSON / 45s uploads). */
  timeoutMs?: number;
}

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", json, form, auth = true, query, timeoutMs } = options;

  let url = `${API_BASE_URL}${path}`;
  if (query) {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {};
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;
  if (json !== undefined) headers["Content-Type"] = "application/json";
  // For `form`, we deliberately DON'T set Content-Type so fetch adds the
  // multipart boundary itself.

  // Uploads (selfies, signatures) get a longer budget than plain JSON calls.
  const effectiveTimeout = timeoutMs ?? (form ? 45000 : 20000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), effectiveTimeout);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : form,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new ApiError(
        "The server took too long to respond. Check your connection and try again.",
        0,
        null
      );
    }
    throw new ApiError(
      "Can't reach the server. Check your internet connection and try again.",
      0,
      null
    );
  } finally {
    clearTimeout(timer);
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.status === 401) {
    onUnauthorized?.();
    throw new ApiError(body?.message ?? "Your session expired. Please sign in again.", 401, body);
  }

  if (!res.ok || (body && body.success === false)) {
    throw new ApiError(body?.message ?? "Something went wrong. Please try again.", res.status, body);
  }

  return body as T;
}

export const api = {
  get: <T = any>(path: string, opts?: Omit<RequestOptions, "method" | "json" | "form">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T = any>(path: string, opts?: Omit<RequestOptions, "method">) =>
    request<T>(path, { ...opts, method: "POST" }),
  put: <T = any>(path: string, opts?: Omit<RequestOptions, "method">) =>
    request<T>(path, { ...opts, method: "PUT" }),
};

interface UploadOptions {
  fileUri: string;
  fieldName: string;
  httpMethod?: "POST" | "PUT";
  /** Extra text form fields sent alongside the file. */
  fields?: Record<string, string>;
  mimeType?: string;
  auth?: boolean;
}

/**
 * Uploads a single file via Expo's NATIVE multipart uploader rather than
 * `fetch` + `FormData`. React Native's JS FormData file handling is unreliable
 * (especially under the New Architecture) — the file part can silently fail to
 * serialize, so the server receives no usable image. `FileSystem.uploadAsync`
 * streams the file from disk on the native side and avoids that entirely.
 */
export async function uploadFile<T = any>(path: string, opts: UploadOptions): Promise<T> {
  const { fileUri, fieldName, httpMethod = "POST", fields, mimeType, auth = true } = opts;

  const headers: Record<string, string> = {};
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;

  let result: FileSystem.FileSystemUploadResult;
  try {
    result = await FileSystem.uploadAsync(`${API_BASE_URL}${path}`, fileUri, {
      httpMethod,
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName,
      mimeType,
      parameters: fields,
      headers,
    });
  } catch {
    throw new ApiError(
      "Can't reach the server. Check your internet connection and try again.",
      0,
      null
    );
  }

  let body: any = null;
  try {
    body = JSON.parse(result.body);
  } catch {
    body = null;
  }

  if (__DEV__) {
    // Surfaces the exact server response in the Metro logs while debugging uploads.
    console.log(`[upload] ${httpMethod} ${path} -> ${result.status}`, result.body?.slice(0, 300));
  }

  if (result.status === 401) {
    onUnauthorized?.();
    throw new ApiError(body?.message ?? "Your session expired. Please sign in again.", 401, body);
  }

  if (result.status < 200 || result.status >= 300 || (body && body.success === false)) {
    throw new ApiError(body?.message ?? "Upload failed. Please try again.", result.status, body);
  }

  return body as T;
}

interface PresignedUploadOptions {
  fileUri: string;
  /** Must match the Content-Type the presigned URL was signed with. */
  contentType: string;
  /** Called with a 0..1 fraction as bytes stream to S3. */
  onProgress?: (fraction: number) => void;
}

/**
 * PUTs a file's raw bytes directly to a presigned S3 URL, streaming from disk
 * with progress. This bypasses our EC2 server entirely — the phone uploads
 * straight to S3. We use `createUploadTask` with BINARY_CONTENT (not multipart)
 * because a presigned PUT expects the file body as-is, and RN's `fetch` can't
 * reliably stream a large local file. Unlike `uploadFile`, there's no bearer
 * token here — the presigned URL is the credential.
 */
export async function uploadFileToUrl(
  url: string,
  { fileUri, contentType, onProgress }: PresignedUploadOptions
): Promise<{ status: number; etag: string | null }> {
  const task = FileSystem.createUploadTask(
    url,
    fileUri,
    {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": contentType },
    },
    (data) => {
      if (onProgress && data.totalBytesExpectedToSend > 0) {
        onProgress(Math.min(1, data.totalBytesSent / data.totalBytesExpectedToSend));
      }
    }
  );

  let result: FileSystem.FileSystemUploadResult | null | undefined;
  try {
    result = await task.uploadAsync();
  } catch (err: any) {
    // A THROW here (vs. a non-2xx result below) means the request never
    // completed at the transport layer — the device couldn't connect to the
    // presigned URL's host (unreachable/internal address, bad TLS, blocked
    // port). It is NOT a signature/content-type mismatch (those return a 403
    // result and fall through to the status check).
    if (__DEV__) {
      let host = url;
      try {
        host = new URL(url).host;
      } catch {}
      console.log(`[upload] PUT to ${host} threw:`, err?.message ?? err);
    }
    throw new ApiError(
      "Upload failed. Check your connection and try again.",
      0,
      { reason: "transport", detail: err?.message ?? String(err) }
    );
  }

  if (__DEV__) {
    console.log(`[upload] PUT -> ${result?.status}`, result?.body?.slice?.(0, 300));
  }

  if (!result) {
    // uploadAsync resolves undefined when the task is cancelled.
    throw new ApiError("Upload was interrupted. Please try again.", 0, null);
  }

  if (result.status < 200 || result.status >= 300) {
    // S3 returned an error (e.g. 403 SignatureDoesNotMatch). result.body holds
    // the XML explaining exactly why — surfaced in the dev log above.
    throw new ApiError("Upload failed. Please try again.", result.status, result.body ?? null);
  }

  const headers = (result.headers ?? {}) as Record<string, string>;
  return { status: result.status, etag: headers.ETag ?? headers.etag ?? null };
}
