import { WorkerRole } from "@/constants/onboarding";

export interface ReferenceContact {
  name: string;
  relationship: string | null;
  phone: string;
}

const createEmptyReference = (): ReferenceContact => ({ name: "", relationship: null, phone: "" });

export interface OnboardingData {
  // Screen 2 — personal details
  fullName: string;
  dob: string | null; // ISO date
  gender: "male" | "female" | "unspecified" | null;
  role: WorkerRole | null;
  selfieUri: string | null;

  // Screen 3 — location
  city: string | null;
  locality: string | null;
  pincode: string;
  address: string;
  radiusKm: number | null;

  // Screen 4 — Aadhaar
  aadhaarNumber: string;
  aadhaarLinkedMobile: string;
  aadhaarVerified: boolean;
  aadhaarName: string | null;
  aadhaarDob: string | null;

  // Screen 5 — face match
  faceMatchStatus: "pending" | "success" | "failed" | "review";
  faceMatchAttempts: number;

  // Screen 6 — work details
  skills: string[];
  experience: "lt1" | "1to3" | "3to5" | "gt5" | null;
  workedBefore: boolean | null;
  priorPlatformName: string;
  priorPlatformDuration: string;
  ownsEquipment: boolean | null;
  equipment: string[];
  preferredHours: string | null;
  preferredDays: string | null;

  // Screen 7 — references
  reference1: ReferenceContact;
  reference2: ReferenceContact;
  referenceConsent: boolean;

  // Screen 8 — consent
  consent1: boolean;
  consent2: boolean;
  signature: string | null;

  // Screen 9
  applicationId: string | null;
  submittedAt: string | null;
}

export const createEmptyOnboardingData = (): OnboardingData => ({
  fullName: "",
  dob: null,
  gender: null,
  role: null,
  selfieUri: null,

  city: null,
  locality: null,
  pincode: "",
  address: "",
  radiusKm: null,

  aadhaarNumber: "",
  aadhaarLinkedMobile: "",
  aadhaarVerified: false,
  aadhaarName: null,
  aadhaarDob: null,

  faceMatchStatus: "pending",
  faceMatchAttempts: 0,

  skills: [],
  experience: null,
  workedBefore: null,
  priorPlatformName: "",
  priorPlatformDuration: "",
  ownsEquipment: null,
  equipment: [],
  preferredHours: null,
  preferredDays: null,

  reference1: createEmptyReference(),
  reference2: createEmptyReference(),
  referenceConsent: false,

  consent1: false,
  consent2: false,
  signature: null,

  applicationId: null,
  submittedAt: null,
});
