import { useState, useEffect, useCallback, useRef } from "react";

const DRAFT_PREFIX = "fitjourney_draft_";

/**
 * Hook to auto-save and restore form drafts from localStorage.
 * @param formKey Unique key for this form (e.g., "checkin_<userId>")
 * @param debounceMs Debounce interval for auto-save (default 1500ms)
 */
export function useFormDraft<T extends Record<string, any>>(
  formKey: string,
  debounceMs = 1500
) {
  const storageKey = DRAFT_PREFIX + formKey;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  // Load draft on mount
  const loadDraft = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed._savedAt) {
        // Expire drafts older than 7 days
        const age = Date.now() - parsed._savedAt;
        if (age > 7 * 24 * 60 * 60 * 1000) {
          localStorage.removeItem(storageKey);
          return null;
        }
        const { _savedAt, ...data } = parsed;
        return data as T;
      }
      return null;
    } catch {
      return null;
    }
  }, [storageKey]);

  // Check if draft exists on mount
  useEffect(() => {
    setHasDraft(loadDraft() !== null);
  }, [loadDraft]);

  // Save draft (debounced)
  const saveDraft = useCallback(
    (data: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          const hasContent = Object.values(data).some(
            (v) => v !== "" && v !== null && v !== undefined && v !== false
          );
          if (!hasContent) return;
          localStorage.setItem(
            storageKey,
            JSON.stringify({ ...data, _savedAt: Date.now() })
          );
          setHasDraft(true);
        } catch {
          // localStorage full or unavailable
        }
      }, debounceMs);
    },
    [storageKey, debounceMs]
  );

  // Clear draft (after successful submit)
  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHasDraft(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [storageKey]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { loadDraft, saveDraft, clearDraft, hasDraft };
}
