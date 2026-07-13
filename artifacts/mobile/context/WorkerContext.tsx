import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { MOCK_JOBS, MockJob, SERVICE_CATEGORIES } from "@/constants/services";

interface WorkerProfile {
  id: string;
  name: string;
  phone: string;
  city: string;
  expertise: string[];
  rating: number;
  totalJobs: number;
  isOnline: boolean;
  balance: number;
}

interface WorkerContextType {
  worker: WorkerProfile;
  jobs: MockJob[];
  isOnline: boolean;
  toggleOnline: () => void;
  acceptJob: (jobId: string) => void;
  rejectJob: (jobId: string) => void;
  startJob: (jobId: string) => void;
  completeJob: (jobId: string) => void;
  toggleExpertise: (categoryId: string) => void;
  pendingJobs: MockJob[];
  activeJobs: MockJob[];
  upcomingJobs: MockJob[];
  completedJobs: MockJob[];
  todayEarnings: number;
  weekEarnings: number;
}

const defaultWorker: WorkerProfile = {
  id: "worker_001",
  name: "Kiran Kumar",
  phone: "+91 98765 43210",
  city: "Bangalore",
  expertise: ["cleaning", "electrical", "plumbing"],
  rating: 4.8,
  totalJobs: 127,
  isOnline: true,
  balance: 3240,
};

const WorkerContext = createContext<WorkerContextType | null>(null);

export function WorkerProvider({ children }: { children: React.ReactNode }) {
  const [worker, setWorker] = useState<WorkerProfile>(defaultWorker);
  const [jobs, setJobs] = useState<MockJob[]>(MOCK_JOBS);

  useEffect(() => {
    loadWorkerData();
  }, []);

  const loadWorkerData = async () => {
    try {
      const stored = await AsyncStorage.getItem("worker_profile");
      if (stored) {
        setWorker(JSON.parse(stored));
      }
      const storedJobs = await AsyncStorage.getItem("worker_jobs");
      if (storedJobs) {
        setJobs(JSON.parse(storedJobs));
      }
    } catch {}
  };

  const saveWorker = async (updated: WorkerProfile) => {
    setWorker(updated);
    await AsyncStorage.setItem("worker_profile", JSON.stringify(updated)).catch(() => {});
  };

  const saveJobs = async (updated: MockJob[]) => {
    setJobs(updated);
    await AsyncStorage.setItem("worker_jobs", JSON.stringify(updated)).catch(() => {});
  };

  const toggleOnline = useCallback(() => {
    saveWorker({ ...worker, isOnline: !worker.isOnline });
  }, [worker]);

  const acceptJob = useCallback((jobId: string) => {
    setJobs((prev) => {
      const updated = prev.map((j) =>
        j.id === jobId ? { ...j, status: "accepted" as const } : j
      );
      AsyncStorage.setItem("worker_jobs", JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const rejectJob = useCallback((jobId: string) => {
    setJobs((prev) => {
      const updated = prev.map((j) =>
        j.id === jobId ? { ...j, status: "rejected" as const } : j
      );
      AsyncStorage.setItem("worker_jobs", JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const startJob = useCallback((jobId: string) => {
    setJobs((prev) => {
      const updated = prev.map((j) =>
        j.id === jobId ? { ...j, status: "active" as const } : j
      );
      AsyncStorage.setItem("worker_jobs", JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const completeJob = useCallback(
    (jobId: string) => {
      setJobs((prev) => {
        const updated = prev.map((j) =>
          j.id === jobId ? { ...j, status: "completed" as const, workerRating: 5 } : j
        );
        AsyncStorage.setItem("worker_jobs", JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      const job = jobs.find((j) => j.id === jobId);
      if (job) {
        const earned = job.price - job.platformFee;
        saveWorker({
          ...worker,
          balance: worker.balance + earned,
          totalJobs: worker.totalJobs + 1,
        });
      }
    },
    [jobs, worker]
  );

  const toggleExpertise = useCallback(
    (categoryId: string) => {
      const updated = worker.expertise.includes(categoryId)
        ? worker.expertise.filter((e) => e !== categoryId)
        : [...worker.expertise, categoryId];
      saveWorker({ ...worker, expertise: updated });
    },
    [worker]
  );

  const visibleJobs = jobs.filter((j) =>
    worker.expertise.includes(j.serviceType)
  );

  const pendingJobs = visibleJobs.filter((j) => j.status === "pending");
  const activeJobs = jobs.filter((j) => j.status === "active");
  const upcomingJobs = jobs.filter((j) => j.status === "accepted");
  const completedJobs = jobs.filter((j) => j.status === "completed");

  const todayEarnings = completedJobs
    .filter((j) => {
      const d = new Date(j.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    })
    .reduce((sum, j) => sum + (j.price - j.platformFee), 0);

  const weekEarnings = completedJobs
    .filter((j) => {
      const d = new Date(j.createdAt);
      const now = new Date();
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    })
    .reduce((sum, j) => sum + (j.price - j.platformFee), 0);

  return (
    <WorkerContext.Provider
      value={{
        worker,
        jobs,
        isOnline: worker.isOnline,
        toggleOnline,
        acceptJob,
        rejectJob,
        startJob,
        completeJob,
        toggleExpertise,
        pendingJobs,
        activeJobs,
        upcomingJobs,
        completedJobs,
        todayEarnings,
        weekEarnings,
      }}
    >
      {children}
    </WorkerContext.Provider>
  );
}

export function useWorker() {
  const ctx = useContext(WorkerContext);
  if (!ctx) throw new Error("useWorker must be used within WorkerProvider");
  return ctx;
}
