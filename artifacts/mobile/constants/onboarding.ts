export type WorkerRole = "cleaning" | "cooking" | "electrical";

export interface RoleOption {
  id: WorkerRole;
  name: string;
  icon: string;
  color: string;
  lightColor: string;
}

// Reuses the same ids/colors as SERVICE_CATEGORIES in constants/services.ts
// so a worker's onboarding role reads as the same visual chip everywhere else in the app.
export const WORKER_ROLES: RoleOption[] = [
  { id: "cleaning", name: "Cleaning", icon: "droplet", color: "#3B82F6", lightColor: "#DBEAFE" },
  { id: "cooking", name: "Cooking", icon: "coffee", color: "#EF4444", lightColor: "#FEE2E2" },
  { id: "electrical", name: "Electrician", icon: "zap", color: "#F59E0B", lightColor: "#FEF3C7" },
];

export const ROLE_SKILLS: Record<WorkerRole, string[]> = {
  cleaning: [
    "Basic home cleaning (sweeping, mopping, dusting)",
    "Kitchen cleaning",
    "Bathroom cleaning",
    "Deep cleaning",
    "Sofa / carpet cleaning",
    "Office / commercial cleaning",
    "Post-construction cleaning",
  ],
  cooking: [
    "North Indian cuisine",
    "South Indian cuisine",
    "Chinese cuisine",
    "Continental cuisine",
    "Baking & desserts",
    "Daily tiffin service",
    "Event / party catering",
  ],
  electrical: [
    "Wiring & rewiring",
    "Switchboard & socket repair",
    "Fan & light installation",
    "Appliance repair",
    "Inverter / UPS setup",
    "AC electrical work",
    "MCB / fuse box repair",
  ],
};

export const ROLE_EQUIPMENT: Record<WorkerRole, string[]> = {
  cleaning: ["Mop", "Broom", "Bucket", "Cleaning cloth", "Scrubbing brush"],
  cooking: ["Apron", "Knife set", "Tiffin carriers", "Weighing scale"],
  electrical: ["Tester", "Screwdriver set", "Wire cutter", "Multimeter"],
};

export const GENDER_OPTIONS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "unspecified", label: "Prefer not to say" },
] as const;

export const EXPERIENCE_OPTIONS = [
  { id: "lt1", label: "Less than 1 year" },
  { id: "1to3", label: "1 to 3 years" },
  { id: "3to5", label: "3 to 5 years" },
  { id: "gt5", label: "More than 5 years" },
] as const;

export const RADIUS_OPTIONS = [1, 2, 5, 10] as const;

export const WORKING_HOURS_OPTIONS = [
  { id: "morning", label: "Morning", sub: "6am – 12pm" },
  { id: "afternoon", label: "Afternoon", sub: "12pm – 5pm" },
  { id: "evening", label: "Evening", sub: "5pm – 9pm" },
  { id: "flexible", label: "Flexible", sub: "Any time" },
] as const;

export const WORKING_DAYS_OPTIONS = [
  { id: "weekdays", label: "Weekdays" },
  { id: "weekends", label: "Weekends" },
  { id: "all", label: "All days" },
] as const;

export const CITIES = ["Bangalore", "Mumbai", "Delhi", "Pune", "Hyderabad", "Chennai"];

// Mock dataset standing in for Google Places Autocomplete results, scoped per city.
export const LOCALITIES_BY_CITY: Record<string, string[]> = {
  Bangalore: ["Koramangala", "Indiranagar", "HSR Layout", "Whitefield", "Jayanagar", "BTM Layout", "Electronic City"],
  Mumbai: ["Andheri", "Bandra", "Powai", "Malad", "Dadar", "Borivali", "Chembur"],
  Delhi: ["Dwarka", "Rohini", "Saket", "Karol Bagh", "Vasant Kunj", "Lajpat Nagar", "Pitampura"],
  Pune: ["Kothrud", "Hinjewadi", "Viman Nagar", "Baner", "Wakad", "Kharadi"],
  Hyderabad: ["Gachibowli", "Madhapur", "Kukatpally", "Banjara Hills", "Secunderabad"],
  Chennai: ["Adyar", "Velachery", "Anna Nagar", "T Nagar", "Porur"],
};

export interface OnboardingStepMeta {
  key: string;
  title: string;
}

export const ONBOARDING_STEPS: OnboardingStepMeta[] = [
  { key: "personal-details", title: "Personal Details" },
  { key: "location", title: "Location Details" },
  { key: "aadhaar", title: "Aadhaar Verification" },
  { key: "face-match", title: "Selfie Verification" },
  { key: "work-details", title: "Work Details" },
  { key: "references", title: "Reference Details" },
  { key: "consent", title: "Background Check Consent" },
];

export const REFERENCE_RELATIONSHIP_OPTIONS = [
  { id: "past_employer", label: "Past Employer" },
  { id: "neighbor", label: "Neighbor" },
  { id: "known_family", label: "Known Family" },
  { id: "other", label: "Other" },
] as const;

// --- Backend enum mappings -------------------------------------------------
// The UI uses friendly ids/labels; the API expects fixed enum codes. These
// translate local -> server at request time (see services/onboardingApi.ts).

export const GENDER_API: Record<string, string> = {
  male: "male",
  female: "female",
  unspecified: "prefer_not_to_say",
};

export const EXPERIENCE_API: Record<string, string> = {
  lt1: "lt_1",
  "1to3": "1_3",
  "3to5": "3_5",
  gt5: "gt_5",
};

// workingHours ids already match the server (morning/afternoon/evening/flexible).
export const WORKING_DAYS_API: Record<string, string> = {
  weekdays: "weekdays",
  weekends: "weekends",
  all: "all_days",
};

// The server's work-details endpoint currently only defines cleaning enums.
export const CLEANING_SKILL_CODE: Record<string, string> = {
  "Basic home cleaning (sweeping, mopping, dusting)": "basic_home",
  "Kitchen cleaning": "kitchen",
  "Bathroom cleaning": "bathroom",
  "Deep cleaning": "deep_cleaning",
  "Sofa / carpet cleaning": "sofa_carpet",
  "Office / commercial cleaning": "office_commercial",
  "Post-construction cleaning": "post_construction",
};

export const EQUIPMENT_CODE: Record<string, string> = {
  Mop: "mop",
  Broom: "broom",
  Bucket: "bucket",
  "Cleaning cloth": "cleaning_cloth",
  "Scrubbing brush": "scrubbing_brush",
};

/** Fallback slug for role skills/equipment the backend doesn't yet enumerate. */
export const slugifyEnum = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/** Maps a server onboardingStep to the route the worker should resume at. */
export const STEP_TO_ROUTE: Record<string, string> = {
  phone: "personal-details",
  personal: "location",
  location: "aadhaar",
  aadhaar: "face-match",
  face_match: "work-details",
  work_details: "references",
  references: "consent",
  consent: "submitted",
  submitted: "submitted",
};
