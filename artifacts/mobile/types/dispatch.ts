/**
 * Types for the real-time job dispatch flow (see the backend integration guide).
 *
 * An `JobOffer` is what a worker sees BEFORE accepting — customer phone is
 * deliberately absent until the job is won. Once accepted the payload upgrades
 * to an `ActiveJob` that includes the customer's contact details.
 */

/**
 * Pricing is fixed at request creation and carried unchanged through every
 * job state (offer → accept → active → completed) — never re-fetch or
 * recompute it, just render the object as given.
 */
export interface JobPricing {
  currency: string;
  totalPrice: number;
  platformFeePercent: number;
  platformFee: number;
  workerEarning: number;
}

/** An open offer pushed to online workers. Phone is hidden until accepted. */
export interface JobOffer {
  id: string;
  category: string;
  subcategory: string;
  address: string;
  distanceKm: number;
  customerName: string;
  customerRating: number;
  jobDescription: string;
  pricing: JobPricing;
  status: string;
  wave: number;
  offeredAt: string;
}

export interface JobCustomer {
  name: string;
  phone: string;
}

export interface JobLocation {
  lat: number;
  lng: number;
}

/**
 * A job that belongs to this worker — either currently in progress or in
 * history. The customer's contact details are available now (post-accept).
 * Fields beyond the core set are best-effort: the `/api/jobs/mine` history
 * shape can carry extras the UI renders when present.
 */
export interface ActiveJob {
  id: string;
  status: string; // "in_progress" | "pending_rating" | "completed" | "cancelled" | …
  category?: string;
  subcategory?: string;
  address: string;
  location?: JobLocation | null;
  customer?: JobCustomer | null;
  customerName?: string;
  customerRating?: number;
  jobDescription?: string;
  distanceKm?: number;
  acceptedAt?: string;
  completedAt?: string;
  createdAt?: string;
  pricing?: JobPricing;
  /** The rating (1-5) this worker gave the customer. Set once completed. */
  jobRating?: number;
}

/** Ack payload returned by the `job:accept` socket event. */
export interface AcceptResult {
  ok: boolean;
  job?: ActiveJob;
  message?: string;
}

/** Response shape of `GET /api/jobs/mine`. */
export interface MyJobs {
  active: ActiveJob[];
  history: ActiveJob[];
}
