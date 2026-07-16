import { api, uploadFile } from "./apiClient";
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
