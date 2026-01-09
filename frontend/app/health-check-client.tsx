"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function HealthCheckClient() {
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const result = await api.healthCheck();
        console.log("Backend health check passed:", result);
      } catch (error) {
        console.error("Backend health check failed:", error);
        toast.error("Backend is not responding. Please ensure it's running.");
      }
    };

    checkBackendHealth();
  }, []);

  return null;
}
