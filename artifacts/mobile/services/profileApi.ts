import { api, uploadFile } from "./apiClient";
import { normalizePresign, uploadFileToUrl } from "./videoUpload";
import { ProfileData } from "@/types/profile";

export async function fetchProfile(): Promise<ProfileData> {
  const data = await api.get<{ profile: ProfileData }>("/api/profile");
  return data.profile;
}

export async function updateExpertise(
  payload: { category: string; subcategories: string[] }[]
): Promise<ProfileData> {
  const data = await api.put<{ profile: ProfileData }>("/api/profile/expertise", {
    json: { expertise: payload },
  });
  return data.profile;
}

export async function updateProfile(payload: {
  fullName?: string;
  city?: string;
  photoUri?: string;
  photoMimeType?: string;
}): Promise<ProfileData> {
  if (payload.photoUri) {
    const data = await uploadFile<{ profile: ProfileData }>("/api/profile", {
      fileUri: payload.photoUri,
      fieldName: "photo",
      mimeType: payload.photoMimeType,
      httpMethod: "PUT",
      fields: {
        ...(payload.fullName ? { fullName: payload.fullName } : {}),
        ...(payload.city ? { city: payload.city } : {}),
      },
    });
    return data.profile;
  }

  const data = await api.put<{ profile: ProfileData }>("/api/profile", {
    json: {
      fullName: payload.fullName,
      city: payload.city,
    },
  });
  return data.profile;
}

// --- Add-a-specialization video (presigned upload + review) ----------------
//
// Adding a new specialization requires a demonstration video, reviewed by our
// team before it goes live — same presign -> PUT-to-S3 -> confirm flow as the
// onboarding practical task. After confirm the subcategory is `pending` until
// a reviewer approves it, at which point it becomes `active`.

async function getExpertiseVideoPresignedUrl(input: {
  category: string;
  subcategory: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}) {
  const raw = await api.post<Record<string, any>>(
    "/api/profile/expertise/video/presigned-url",
    { json: input }
  );
  return normalizePresign(raw);
}

/**
 * Uploads a demonstration video for one specialization and submits it for
 * review. Reports upload progress (0..1). Returns the updated profile when the
 * backend includes it (subcategory now `pending`); otherwise null, and the
 * caller should refetch.
 */
export async function submitExpertiseVideo(params: {
  category: string;
  subcategory: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  durationSeconds: number;
  onProgress?: (fraction: number) => void;
}): Promise<{ s3Key: string | undefined; profile: ProfileData | null }> {
  const { url, s3Key } = await getExpertiseVideoPresignedUrl({
    category: params.category,
    subcategory: params.subcategory,
    fileName: params.fileName,
    fileType: params.mimeType,
    fileSize: params.fileSize,
  });

  await uploadFileToUrl(url, {
    fileUri: params.fileUri,
    contentType: params.mimeType,
    onProgress: params.onProgress,
  });

  const res = await api.post<{ profile?: ProfileData }>("/api/profile/expertise/video/submit", {
    json: {
      category: params.category,
      subcategory: params.subcategory,
      s3Key,
      durationSeconds: Math.round(params.durationSeconds),
      fileSize: params.fileSize,
    },
  });

  return { s3Key, profile: res.profile ?? null };
}
