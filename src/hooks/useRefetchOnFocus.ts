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

    // 🛡️ SOBERANIA DETERMINÍSTICA: Evitar refetch excessivo.
    // Só re-validar se passaram mais de 60s desde o último refetch por foco.
    const REFRESH_THRESHOLD = 60000; 

    const handleFocus = () => {
      const now = Date.now();
      
      // Se o último refetch foi há menos de 60s, não faz nada
      if (now - lastRefetchRef.current < REFRESH_THRESHOLD) {
        return;
      }

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
