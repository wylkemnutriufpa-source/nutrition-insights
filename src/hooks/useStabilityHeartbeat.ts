import { useEffect, useState } from "react";

/**
 * useStabilityHeartbeat
 * Monitors if the app stays in a loading state for too long.
 */
export function useStabilityHeartbeat(isLoading: boolean, maxWaitMs = 15000) {
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsStuck(false);
      return;
    }

    const timer = setTimeout(() => {
      if (isLoading) {
        console.error("[Stability:Heartbeat] App seems STUCK in loading state.");
        setIsStuck(true);
      }
    }, maxWaitMs);

    return () => clearTimeout(timer);
  }, [isLoading, maxWaitMs]);

  const recover = () => {
    console.log("[Stability:Heartbeat] Manual recovery triggered.");
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  return { isStuck, recover };
}
