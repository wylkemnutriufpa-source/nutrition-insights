/**
 * useRefetchOnFocus — Refetch critical queries when the app regains focus.
 * 
 * Handles both window focus and visibility change (mobile tab switch).
 * Debounced to avoid duplicate refetches.
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateCriticalQueries } from "@/lib/queryInvalidation";
import { useAuth } from "@/lib/auth";

export function useRefetchOnFocus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastRefetchRef = useRef(0);

  useEffect(() => {
    if (!user) return;

    const DEBOUNCE_MS = 3000; // Don't refetch more than once per 3s

    const handleFocus = () => {
      const now = Date.now();
      if (now - lastRefetchRef.current < DEBOUNCE_MS) return;
      lastRefetchRef.current = now;
      invalidateCriticalQueries(queryClient, user.id);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") handleFocus();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user, queryClient]);
}
