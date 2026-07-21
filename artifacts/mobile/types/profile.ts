/**
 * A specialization the worker can hold. Adding a new one is gated behind a
 * demonstration video that our team reviews, so a subcategory can be in one of
 * a few states:
 *   - active:   approved and live on the worker's profile
 *   - pending:  a video was submitted and is awaiting review
 *   - rejected: the last submission was not approved (worker may retry)
 *   - none:     not held; can be added by submitting a video
 */
export type ExpertiseStatus = "active" | "pending" | "rejected" | "none";

export interface ProfileExpertiseSubcategory {
  key: string;
  name: string;
  active: boolean;
  /**
   * Present when the backend tracks review state. When absent we derive it
   * from `active` (see `subcategoryStatus`), so older responses still render.
   */
  status?: ExpertiseStatus;
}

export interface ProfileExpertiseCategory {
  category: string;
  name: string;
  active: boolean;
  subcategories: ProfileExpertiseSubcategory[];
}

export interface ProfileData {
  fullName: string;
  city: string;
  photoUrl: string | null;
  displayInitial: string;
  rating: number | null;
  jobsCompleted: number;
  expertise: ProfileExpertiseCategory[];
  account: {
    serviceArea: string;
    phone: string;
  };
}

/** Resolves the effective review state of a subcategory. */
export function subcategoryStatus(sub: ProfileExpertiseSubcategory): ExpertiseStatus {
  if (sub.status) return sub.status;
  return sub.active ? "active" : "none";
}
