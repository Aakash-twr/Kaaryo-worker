import * as Haptics from "expo-haptics";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, AppState, Platform } from "react-native";

import { RatingModal } from "@/components/RatingModal";
import { useAuth } from "@/context/AuthContext";
import { completeJobApi, fetchMyJobs, rateJobApi } from "@/services/jobsApi";
import {
  ensureLocationPermission,
  getCurrentCoords,
} from "@/services/location";
import { connectSocket, disconnectSocket, getSocket } from "@/services/socket";
import { AcceptResult, ActiveJob, JobOffer } from "@/types/dispatch";

/** How often we refresh the worker's location while online (ms). */
const HEARTBEAT_MS = 30000;

/** Raised when going online fails (e.g. location permission denied). */
export class GoOnlineError extends Error {}

interface DispatchContextType {
  /** Socket is connected and receiving events. */
  connected: boolean;
  /** Worker is online and eligible to receive offers. */
  isOnline: boolean;
  /** Open offers pushed to this worker, newest first. */
  offers: JobOffer[];
  /** Jobs currently assigned to this worker (in progress). */
  activeJobs: ActiveJob[];
  /** Completed / past jobs. */
  history: ActiveJob[];
  /** True while the initial /api/jobs/mine fetch is in flight. */
  loadingJobs: boolean;

  /** Go online (asks for location) or offline. Throws GoOnlineError on failure. */
  setOnline: (next: boolean) => Promise<void>;
  /** Accept an offer; resolves with the ack (customer contact on success). */
  acceptOffer: (id: string) => Promise<AcceptResult>;
  /** Decline an offer; removes it locally. */
  declineOffer: (id: string) => Promise<void>;
  /** Mark an in-progress job complete (REST) and refresh the job lists. */
  completeJob: (id: string) => Promise<void>;
  /** Re-fetch active + history from the server. */
  refreshJobs: () => Promise<void>;
}

const DispatchContext = createContext<DispatchContextType | null>(null);

export function DispatchProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const isActive = status === "active";

  const [connected, setConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [history, setHistory] = useState<ActiveJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Refs so socket callbacks and timers read the latest value without
  // re-subscribing on every state change.
  const onlineRef = useRef(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const refreshJobs = useCallback(async () => {
    try {
      const { active, history: past } = await fetchMyJobs();
      setActiveJobs(active);
      setHistory(past);
    } catch {
      // Non-fatal: leave existing lists in place (offline / transient error).
    }
  }, []);

  /** Emit presence with a fresh location fix. Assumes permission granted. */
  const emitPresence = useCallback(async (online: boolean) => {
    const socket = getSocket();
    if (!socket) return;
    if (!online) {
      socket.emit("presence:update", { isOnline: false });
      return;
    }
    const { lat, lng } = await getCurrentCoords();
    socket.emit("presence:update", { isOnline: true, lat, lng });
  }, []);

  const setOnline = useCallback(
    async (next: boolean) => {
      if (next) {
        const granted = await ensureLocationPermission();
        if (!granted) {
          throw new GoOnlineError(
            "Location permission is required to go online and receive jobs.",
          );
        }
        try {
          await emitPresence(true);
        } catch {
          throw new GoOnlineError(
            "Couldn't get your location. Turn on location services and try again.",
          );
        }
        onlineRef.current = true;
        setIsOnline(true);
        stopHeartbeat();
        // Keep the worker's position fresh for matching (push, not poll).
        heartbeatRef.current = setInterval(() => {
          emitPresence(true).catch(() => {});
        }, HEARTBEAT_MS);
      } else {
        stopHeartbeat();
        onlineRef.current = false;
        setIsOnline(false);
        setOffers([]);
        await emitPresence(false).catch(() => {});
      }
    },
    [emitPresence, stopHeartbeat],
  );

  const acceptOffer = useCallback(
    (id: string): Promise<AcceptResult> => {
      return new Promise<AcceptResult>((resolve) => {
        const socket = getSocket();
        if (!socket) {
          resolve({ ok: false, message: "Not connected. Please try again." });
          return;
        }
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          resolve({
            ok: false,
            message: "Request timed out. Please try again.",
          });
        }, 12000);

        socket.emit("job:accept", { requestId: id }, (res: AcceptResult) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (res?.ok) {
            setOffers((prev) => prev.filter((o) => o.id !== id));
            refreshJobs();
          }
          resolve(res ?? { ok: false, message: "No response from server." });
        });
      });
    },
    [refreshJobs],
  );

  const declineOffer = useCallback(async (id: string) => {
    setOffers((prev) => prev.filter((o) => o.id !== id));
    const socket = getSocket();
    socket?.emit("job:decline", { requestId: id });
  }, []);

  const completeJob = useCallback(
    async (id: string) => {
      // Moves the job to `pending_rating` — it stays in `activeJobs` until
      // the mandatory rating below is submitted, at which point it becomes
      // `completed` and moves to history on the next refresh.
      await completeJobApi(id);
      await refreshJobs();
    },
    [refreshJobs],
  );

  // Whichever active job is awaiting its rating — drives the global,
  // non-dismissable RatingModal below. Recomputed from `activeJobs` on every
  // refresh, so a job stuck in `pending_rating` (e.g. app was killed mid-
  // rating) surfaces this again automatically once jobs are refetched.
  const pendingRatingJob =
    activeJobs.find((j) => j.status === "pending_rating") ?? null;

  const submitRating = useCallback(
    async (rating: number) => {
      if (!pendingRatingJob) return;
      setRatingSubmitting(true);
      try {
        await rateJobApi(pendingRatingJob.id, rating);
        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
        }
        await refreshJobs();
      } catch (e) {
        Alert.alert(
          "Couldn't submit rating",
          e instanceof Error ? e.message : "Please try again.",
        );
      } finally {
        setRatingSubmitting(false);
      }
    },
    [pendingRatingJob, refreshJobs],
  );

  // ── Socket lifecycle: connect while the session is active ────────────────
  useEffect(() => {
    if (!isActive) {
      stopHeartbeat();
      disconnectSocket();
      setConnected(false);
      setIsOnline(false);
      onlineRef.current = false;
      setOffers([]);
      setActiveJobs([]);
      setHistory([]);
      return;
    }

    const socket = connectSocket();
    if (!socket) return;

    const onConnect = () => {
      setConnected(true);
      // Re-assert presence after a reconnect so matching keeps working.
      if (onlineRef.current) emitPresence(true).catch(() => {});
    };
    const onDisconnect = () => setConnected(false);
    const onConnectError = (e: Error) => {
      if (__DEV__) console.log("[socket] connect_error:", e.message);
    };

    // Server → worker events (see integration guide §4).
    const onSnapshot = ({ jobs }: { jobs?: JobOffer[] }) =>
      setOffers(jobs ?? []);
    const onOffer = (offer: JobOffer) => {
      setOffers((prev) => [offer, ...prev.filter((o) => o.id !== offer.id)]);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }
    };
    const removeOffer = ({ id }: { id: string }) =>
      setOffers((prev) => prev.filter((o) => o.id !== id));

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("jobs:open", onSnapshot);
    socket.on("job:offer", onOffer);
    socket.on("job:taken", removeOffer);
    socket.on("job:expired", removeOffer);

    // Already connected (reused socket) → sync flag immediately.
    if (socket.connected) setConnected(true);

    // Restore any in-progress job that survived an app restart.
    setLoadingJobs(true);
    refreshJobs().finally(() => setLoadingJobs(false));

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("jobs:open", onSnapshot);
      socket.off("job:offer", onOffer);
      socket.off("job:taken", removeOffer);
      socket.off("job:expired", removeOffer);
    };
  }, [isActive, emitPresence, refreshJobs, stopHeartbeat]);

  // ── App resume: reconnect + restore active job ───────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      connectSocket();
      refreshJobs();
      if (onlineRef.current) emitPresence(true).catch(() => {});
    });
    return () => sub.remove();
  }, [isActive, refreshJobs, emitPresence]);

  // Clear the heartbeat on unmount.
  useEffect(() => stopHeartbeat, [stopHeartbeat]);

  return (
    <DispatchContext.Provider
      value={{
        connected,
        isOnline,
        offers,
        activeJobs,
        history,
        loadingJobs,
        setOnline,
        acceptOffer,
        declineOffer,
        completeJob,
        refreshJobs,
      }}
    >
      {children}
      <RatingModal
        job={pendingRatingJob}
        submitting={ratingSubmitting}
        onSubmit={submitRating}
      />
    </DispatchContext.Provider>
  );
}

export function useDispatch() {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error("useDispatch must be used within DispatchProvider");
  return ctx;
}
