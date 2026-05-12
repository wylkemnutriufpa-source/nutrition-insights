import { useRef, useCallback } from "react";

/**
 * Returns a debounced version of a callback.
 * Prevents spam clicks on toggles (checklist, protocol status, etc.)
 */
export function useDebouncedAction<T extends (...args: any[]) => any>(
  fn: T,
  delayMs = 400
): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCallRef = useRef<number>(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      // Hard throttle: ignore if called within delayMs
      if (now - lastCallRef.current < delayMs) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      lastCallRef.current = now;
      timerRef.current = setTimeout(() => {
        fn(...args);
      }, 50); // Near-instant but deduped
    },
    [fn, delayMs]
  );
}
