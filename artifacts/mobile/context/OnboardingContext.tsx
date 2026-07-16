import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { createEmptyOnboardingData, OnboardingData } from "@/types/onboarding";

interface OnboardingContextType {
  data: OnboardingData;
  isReady: boolean;
  lastRoute: string;
  updateData: (patch: Partial<OnboardingData>) => void;
  setLastRoute: (routeKey: string) => void;
  reset: () => void;
}

const DRAFT_KEY = "kaaryo_onboarding_draft";

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(createEmptyOnboardingData());
  const [lastRoute, setLastRouteState] = useState("personal-details");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored) as { data: OnboardingData; lastRoute: string };
          setData(parsed.data);
          setLastRouteState(parsed.lastRoute);
        }
      })
      .finally(() => setIsReady(true));
  }, []);

  const persist = useCallback((nextData: OnboardingData, nextRoute: string) => {
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ data: nextData, lastRoute: nextRoute })).catch(
      () => {}
    );
  }, []);

  const updateData = useCallback(
    (patch: Partial<OnboardingData>) => {
      setData((prev) => {
        const next = { ...prev, ...patch };
        persist(next, lastRoute);
        return next;
      });
    },
    [lastRoute, persist]
  );

  const setLastRoute = useCallback(
    (routeKey: string) => {
      setLastRouteState(routeKey);
      persist(data, routeKey);
    },
    [data, persist]
  );

  const reset = useCallback(() => {
    const empty = createEmptyOnboardingData();
    setData(empty);
    setLastRouteState("personal-details");
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
  }, []);

  return (
    <OnboardingContext.Provider
      value={{ data, isReady, lastRoute, updateData, setLastRoute, reset }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
