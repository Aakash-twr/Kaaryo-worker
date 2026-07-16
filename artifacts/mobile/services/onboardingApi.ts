import {
  CLEANING_SKILL_CODE,
  EQUIPMENT_CODE,
  EXPERIENCE_API,
  GENDER_API,
  slugifyEnum,
  WORKING_DAYS_API,
} from "@/constants/onboarding";
import { api, uploadFile } from "@/services/apiClient";

/**
 * Typed wrappers over the Kaaryo backend (see the integration guide).
 * Every call returns the parsed success envelope; failures throw ApiError
 * (from apiClient) with the server message + payload attached.
 */

// --- helpers ---------------------------------------------------------------

function guessMimeFromUri(uri: string): string {
  const last = uri.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  if (last === "png") return "image/png";
  if (last === "heic") return "image/heic";
  if (last === "webp") return "image/webp";
  if (last === "svg") return "image/svg+xml";
  return "image/jpeg";
}

// --- Screen 1: phone OTP (no auth) ----------------------------------------

export interface WorkerSummary {
  id: string;
  phone: string;
  status: string;
  onboardingStep: string;
  fullName: string | null;
}

export const sendOtp = (phone: string) =>
  api.post<{ cooldownSeconds?: number }>("/api/auth/send-otp", { auth: false, json: { phone } });

export const resendOtp = (phone: string) =>
  api.post<{ cooldownSeconds?: number }>("/api/auth/resend-otp", { auth: false, json: { phone } });

export const verifyOtp = (phone: string, otp: string) =>
  api.post<{ token: string; isNewUser: boolean; worker: WorkerSummary }>("/api/auth/verify-otp", {
    auth: false,
    json: { phone, otp },
  });

// --- Screen 3 helpers: places (no auth) -----------------------------------

export const fetchCities = () =>
  api.get<{ cities: string[] }>("/api/places/cities", { auth: false }).then((r) => r.cities);

export const fetchLocalitySuggestions = (city: string, q: string) =>
  api
    .get<{ suggestions: string[] }>("/api/places/suggest", { auth: false, query: { city, q } })
    .then((r) => r.suggestions);

// --- Screen 2: personal details (multipart) -------------------------------

export function savePersonal(input: {
  fullName: string;
  dob: string; // YYYY-MM-DD
  gender: string; // local id
  photoUri: string;
  photoMimeType?: string;
}) {
  return uploadFile<{ profilePhoto: string; onboardingStep: string }>("/api/onboarding/personal", {
    fileUri: input.photoUri,
    fieldName: "profilePhoto",
    httpMethod: "PUT",
    mimeType: input.photoMimeType ?? guessMimeFromUri(input.photoUri),
    fields: {
      fullName: input.fullName,
      dob: input.dob,
      gender: GENDER_API[input.gender] ?? input.gender,
    },
  });
}

// --- Screen 3: location ----------------------------------------------------

export function saveLocation(input: {
  city: string;
  area: string;
  pincode: string;
  address: string;
  travelRadiusKm: number;
}) {
  return api.put<{ onboardingStep: string }>("/api/onboarding/location", { json: input });
}

// --- Screen 4: Aadhaar -----------------------------------------------------

export const requestAadhaarOtp = (aadhaarNumber: string) =>
  api.post<{ refId: string }>("/api/onboarding/aadhaar/request-otp", { json: { aadhaarNumber } });

export const verifyAadhaarOtp = (aadhaarNumber: string, otp: string, refId?: string) =>
  api.post<{
    confirmDetails: { name: string; dob: string };
    mobileMismatch: boolean;
    message: string;
    onboardingStep: string;
  }>("/api/onboarding/aadhaar/verify", { json: { aadhaarNumber, otp, refId } });

// --- Screen 5: face match (multipart) -------------------------------------

export function submitFaceMatch(selfieUri: string, mimeType?: string) {
  // Returns { onboardingStep } on pass, or { manualReview: true } on the soft
  // terminal state. First-attempt failure throws ApiError (400, retryAllowed).
  return uploadFile<{ onboardingStep?: string; manualReview?: boolean; message: string }>(
    "/api/onboarding/face-match",
    {
      fileUri: selfieUri,
      fieldName: "selfie",
      httpMethod: "POST",
      mimeType: mimeType ?? guessMimeFromUri(selfieUri),
    }
  );
}

// --- Screen 6: work details ------------------------------------------------

export function saveWorkDetails(input: {
  skills: string[]; // local labels
  experience: string; // local id
  workedBefore: boolean;
  priorPlatformName: string;
  priorPlatformDuration: string;
  ownsEquipment: boolean;
  equipment: string[]; // local labels
  preferredHours: string; // local id (matches server)
  preferredDays: string; // local id
}) {
  const cleaningTypes = input.skills.map((s) => CLEANING_SKILL_CODE[s] ?? slugifyEnum(s));
  const equipmentList = input.ownsEquipment
    ? input.equipment.map((e) => EQUIPMENT_CODE[e] ?? slugifyEnum(e))
    : [];

  const payload: Record<string, unknown> = {
    cleaningTypes,
    experience: EXPERIENCE_API[input.experience] ?? input.experience,
    workedBefore: input.workedBefore,
    ownsEquipment: input.ownsEquipment,
    equipmentList,
    workingHours: input.preferredHours,
    workingDays: WORKING_DAYS_API[input.preferredDays] ?? input.preferredDays,
  };
  if (input.workedBefore) {
    payload.prevPlatform = {
      name: input.priorPlatformName,
      duration: input.priorPlatformDuration,
    };
  }
  return api.put<{ onboardingStep: string }>("/api/onboarding/work-details", { json: payload });
}

// --- Screen 7: references --------------------------------------------------

export function saveReferences(input: {
  referenceConsent: boolean;
  references: { name: string; relationship: string; phone: string }[];
}) {
  return api.put<{ onboardingStep: string }>("/api/onboarding/references", { json: input });
}

// --- Screen 8: consent + Aadhaar e-sign -----------------------------------

export const requestEsignOtp = () =>
  api.post("/api/onboarding/consent/esign/request-otp");

export const verifyEsignOtp = (otp: string) =>
  api.post("/api/onboarding/consent/esign/verify", { json: { otp } });

export function saveConsent(input: {
  backgroundCheck: boolean;
  infoAccurate: boolean;
  signatureUri?: string | null;
}) {
  const fields = {
    backgroundCheck: input.backgroundCheck ? "true" : "false",
    infoAccurate: input.infoAccurate ? "true" : "false",
  };
  // Drawn-signature path: upload the SVG file natively.
  if (input.signatureUri) {
    return uploadFile<{ signedAt: string; onboardingStep: string }>("/api/onboarding/consent", {
      fileUri: input.signatureUri,
      fieldName: "signature",
      httpMethod: "POST",
      mimeType: "image/svg+xml",
      fields,
    });
  }
  // e-Sign path: no file. Text-only multipart is reliable via fetch.
  const form = new FormData();
  form.append("backgroundCheck", fields.backgroundCheck);
  form.append("infoAccurate", fields.infoAccurate);
  return api.post<{ signedAt: string; onboardingStep: string }>("/api/onboarding/consent", {
    form,
  });
}

// --- Screen 9: submit + status --------------------------------------------

export interface NextStep {
  step: number;
  title: string;
  eta: string;
}

export const submitApplication = () =>
  api.post<{ name: string; referralCode: string; nextSteps: NextStep[] }>(
    "/api/onboarding/submit"
  );

export interface StatusResponse {
  status: string;
  onboardingStep: string;
  progress: Record<string, boolean | string>;
  referralCode: string;
  submittedAt: string;
}

export const fetchStatus = () => api.get<StatusResponse>("/api/onboarding/status");
