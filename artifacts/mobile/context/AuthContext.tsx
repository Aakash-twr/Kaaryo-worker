import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { resendOtp, sendOtp, verifyOtp } from "@/services/onboardingApi";
import {
  loadAuthToken,
  setAuthToken,
  setUnauthorizedHandler,
} from "@/services/apiClient";

/** Guard-level status used by the root layout to pick which stack to show. */
export type SessionStatus = "logged_out" | "onboarding" | "pending_review" | "active";

const SESSION_KEY = "kaaryo_session";

interface StoredSession {
  phone: string;
  serverStatus: string;
  onboardingStep: string;
  fullName: string | null;
}

interface VerifyResult {
  ok: boolean;
  /** Route to navigate to on success. */
  target?: string;
  message?: string;
}

interface AuthContextType {
  status: SessionStatus;
  /** Raw backend status (submitted / under_review / manual_review / …). */
  serverStatus: string | null;
  onboardingStep: string | null;
  phone: string | null;
  fullName: string | null;
  isReady: boolean;
  requestOtp: (phone: string) => Promise<{ cooldownSeconds: number }>;
  resendCode: (phone: string) => Promise<{ cooldownSeconds: number }>;
  verifyCode: (phone: string, otp: string) => Promise<VerifyResult>;
  /** Advance the persisted onboarding step after a screen saves successfully. */
  setOnboardingStep: (step: string) => void;
  /** Apply a backend status change (e.g. manual review, submitted). */
  applyServerStatus: (serverStatus: string, onboardingStep?: string) => void;
  logout: () => Promise<void>;
  /** Dev-only: clears token + session locally (server account is untouched). */
  hardReset: () => Promise<void>;
}

function toSessionStatus(serverStatus: string): SessionStatus {
  if (serverStatus === "in_progress") return "onboarding";
  if (serverStatus === "approved") return "active";
  return "pending_review"; // submitted | under_review | manual_review | info_requested | rejected
}

function routeFor(serverStatus: string): string {
  if (serverStatus === "in_progress") return "/onboarding";
  if (serverStatus === "approved") return "/(tabs)";
  return "/onboarding/submitted";
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("logged_out");
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [onboardingStep, setStep] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const persist = useCallback((session: StoredSession | null) => {
    if (session) AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session)).catch(() => {});
    else AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  }, []);

  // Bootstrap: restore token + session, and wire the global 401 handler.
  useEffect(() => {
    (async () => {
      await loadAuthToken();
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw) as StoredSession;
        setPhone(s.phone);
        setServerStatus(s.serverStatus);
        setStep(s.onboardingStep);
        setFullName(s.fullName);
        setStatus(toSessionStatus(s.serverStatus));
      }
      setIsReady(true);
    })();
  }, []);

  const doLogout = useCallback(async () => {
    await setAuthToken(null);
    persist(null);
    setStatus("logged_out");
    setServerStatus(null);
    setStep(null);
    setPhone(null);
    setFullName(null);
  }, [persist]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      doLogout();
    });
    return () => setUnauthorizedHandler(null);
  }, [doLogout]);

  const requestOtp = useCallback(async (phoneNumber: string) => {
    const res = await sendOtp(phoneNumber);
    return { cooldownSeconds: res.cooldownSeconds ?? 30 };
  }, []);

  const resendCode = useCallback(async (phoneNumber: string) => {
    const res = await resendOtp(phoneNumber);
    return { cooldownSeconds: res.cooldownSeconds ?? 30 };
  }, []);

  const verifyCode = useCallback(
    async (phoneNumber: string, otp: string): Promise<VerifyResult> => {
      const res = await verifyOtp(phoneNumber, otp);
      await setAuthToken(res.token);
      const w = res.worker;
      const session: StoredSession = {
        phone: w.phone ?? phoneNumber,
        serverStatus: w.status,
        onboardingStep: w.onboardingStep,
        fullName: w.fullName,
      };
      persist(session);
      setPhone(session.phone);
      setServerStatus(session.serverStatus);
      setStep(session.onboardingStep);
      setFullName(session.fullName);
      setStatus(toSessionStatus(session.serverStatus));
      return { ok: true, target: routeFor(session.serverStatus) };
    },
    [persist]
  );

  const setOnboardingStep = useCallback(
    (step: string) => {
      setStep(step);
      persist({
        phone: phone ?? "",
        serverStatus: serverStatus ?? "in_progress",
        onboardingStep: step,
        fullName,
      });
    },
    [phone, serverStatus, fullName, persist]
  );

  const applyServerStatus = useCallback(
    (nextServerStatus: string, nextStep?: string) => {
      const step = nextStep ?? onboardingStep ?? "submitted";
      setServerStatus(nextServerStatus);
      setStep(step);
      setStatus(toSessionStatus(nextServerStatus));
      persist({ phone: phone ?? "", serverStatus: nextServerStatus, onboardingStep: step, fullName });
    },
    [phone, onboardingStep, fullName, persist]
  );

  const hardReset = useCallback(async () => {
    await doLogout();
  }, [doLogout]);

  return (
    <AuthContext.Provider
      value={{
        status,
        serverStatus,
        onboardingStep,
        phone,
        fullName,
        isReady,
        requestOtp,
        resendCode,
        verifyCode,
        setOnboardingStep,
        applyServerStatus,
        logout: doLogout,
        hardReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
