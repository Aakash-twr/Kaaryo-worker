import { api } from "@/services/apiClient";
import { AcceptResult, ActiveJob, JobOffer, MyJobs } from "@/types/dispatch";

/**
 * REST side of the dispatch flow. The real-time path (offers, accept) runs over
 * the socket; these endpoints cover restore-on-resume, completion, and the
 * REST fallbacks documented in the integration guide.
 */

/** GET /api/jobs/mine → active + past jobs, used to restore state on resume. */
export const fetchMyJobs = () =>
  api
    .get<{ active?: ActiveJob[]; history?: ActiveJob[] }>("/api/jobs/mine")
    .then((r): MyJobs => ({
      active: r.active ?? [],
      history: r.history ?? [],
    }));

/**
 * POST /api/jobs/:id/complete → moves the job to `pending_rating`. The worker
 * isn't done yet — a rating is still required before the job is `completed`
 * and frees up jobsCompleted/history.
 */
export const completeJobApi = (id: string) =>
  api.post<{ success?: boolean; message?: string; job?: ActiveJob }>(
    `/api/jobs/${id}/complete`,
  );

/** POST /api/jobs/:id/rate → submits the mandatory 1-5 star rating, marking the job `completed`. */
export const rateJobApi = (id: string, rating: number) =>
  api.post<{ success?: boolean; message?: string; job?: ActiveJob }>(
    `/api/jobs/${id}/rate`,
    { json: { rating } },
  );

/**
 * PUT /api/jobs/availability — REST alternative to the `presence:update` socket
 * event. The socket version is preferred (one connection); this exists as a
 * fallback / for environments where the socket isn't up yet.
 */
export const setAvailability = (input: {
  isOnline: boolean;
  lat?: number;
  lng?: number;
}) => api.put("/api/jobs/availability", { json: input });

/** GET /api/jobs/available — one-shot snapshot of open offers (don't poll). */
export const fetchAvailable = () =>
  api
    .get<{ jobs?: JobOffer[] }>("/api/jobs/available")
    .then((r) => r.jobs ?? []);

/** POST /api/jobs/:id/accept — REST alternative to the `job:accept` socket event. */
export const acceptJobRest = (id: string) =>
  api.post<AcceptResult>(`/api/jobs/${id}/accept`);
