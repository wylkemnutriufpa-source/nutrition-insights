/**
 * useSignedStorageUrl — Resilient signed URL hook with auto-renewal and backoff.
 *
 * Features:
 * - Generates signed URL from storage path
 * - Auto-renews before expiry (configurable buffer)
 * - Retry with exponential backoff on failure (max 3 attempts)
 * - Accepts legacy full URLs transparently
 * - Exposes url, loading, error, refresh()
 * - Cleans up timers on unmount
 * - Logs renewals to telemetry (no sensitive data)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@v1/integrations/supabase/client";

const SIGNED_URL_DURATION = 3600; // 1 hour
const DEFAULT_REFRESH_BUFFER = 300; // 5 min before expiry
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 2000; // 2s

function isPath(value: string): boolean {
  return (
    !value.startsWith("http://") &&
    !value.startsWith("https://") &&
    !value.startsWith("blob:")
  );
}

function detectBucket(path: string): string {
  if (path.includes("body/") || path.includes("branding/")) return "body-images";
  if (path.includes("lab-exams/") || path.includes("patient-documents")) return "patient-documents";
  if (path.includes("enrollment")) return "enrollment-photos";
  if (path.includes("meal")) return "meal-images";
  return "checkin-photos";
}

interface UseSignedStorageUrlOptions {
  bucket?: string;
  enabled?: boolean;
  refreshBeforeExpirySeconds?: number;
}

interface UseSignedStorageUrlResult {
  url: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useSignedStorageUrl(
  pathOrUrl: string | null | undefined,
  options: UseSignedStorageUrlOptions = {}
): UseSignedStorageUrlResult {
  const {
    bucket,
    enabled = true,
    refreshBeforeExpirySeconds = DEFAULT_REFRESH_BUFFER,
  } = options;

  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renewalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const cancelled = useRef(false);

  const clearTimer = useCallback(() => {
    if (renewalTimer.current) {
      clearTimeout(renewalTimer.current);
      renewalTimer.current = null;
    }
  }, []);

  const resolve = useCallback(async () => {
    if (!pathOrUrl || !enabled) return;
    if (!isPath(pathOrUrl)) {
      setUrl(pathOrUrl);
      setLoading(false);
      setError(null);
      return;
    }

    const resolvedBucket = bucket || detectBucket(pathOrUrl);

    try {
      const { data, error: storageError } = await supabase.storage
        .from(resolvedBucket)
        .createSignedUrl(pathOrUrl, SIGNED_URL_DURATION);

      if (cancelled.current) return;

      if (storageError || !data?.signedUrl) {
        throw new Error(storageError?.message || "Failed to create signed URL");
      }

      setUrl(data.signedUrl);
      setLoading(false);
      setError(null);
      retryCount.current = 0;

      // Schedule next renewal
      const renewIn = Math.max(
        (SIGNED_URL_DURATION - refreshBeforeExpirySeconds) * 1000,
        60_000 // minimum 1 min
      );
      clearTimer();
      renewalTimer.current = setTimeout(() => {
        if (!cancelled.current) resolve();
      }, renewIn);

      // Telemetry (fire-and-forget, no sensitive data)
      console.debug("[SignedURL] renewed", {
        bucket: resolvedBucket,
        renewIn: Math.round(renewIn / 1000) + "s",
      });
    } catch (err: any) {
      if (cancelled.current) return;

      retryCount.current += 1;
      const msg = err?.message || "Unknown error";

      if (retryCount.current <= MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount.current - 1);
        console.warn(
          `[SignedURL] retry ${retryCount.current}/${MAX_RETRIES} in ${delay}ms`,
          { bucket: resolvedBucket }
        );
        clearTimer();
        renewalTimer.current = setTimeout(() => {
          if (!cancelled.current) resolve();
        }, delay);
      } else {
        setError(msg);
        setLoading(false);
        console.error("[SignedURL] max retries reached", {
          bucket: resolvedBucket,
        });
      }
    }
  }, [pathOrUrl, bucket, enabled, refreshBeforeExpirySeconds, clearTimer]);

  useEffect(() => {
    cancelled.current = false;
    retryCount.current = 0;
    clearTimer();

    if (!pathOrUrl || !enabled) {
      setUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (!isPath(pathOrUrl)) {
      setUrl(pathOrUrl);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    resolve();

    return () => {
      cancelled.current = true;
      clearTimer();
    };
  }, [pathOrUrl, bucket, enabled]); // resolve is stable via useCallback deps

  const refresh = useCallback(() => {
    retryCount.current = 0;
    setLoading(true);
    setError(null);
    resolve();
  }, [resolve]);

  return { url, loading, error, refresh };
}

/**
 * Batch resolve multiple paths — async utility (no auto-renewal).
 */
export async function resolveStorageUrl(
  pathOrUrl: string | null | undefined,
  bucket?: string
): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (!isPath(pathOrUrl)) return pathOrUrl;

  const resolvedBucket = bucket || detectBucket(pathOrUrl);
  const { data, error } = await supabase.storage
    .from(resolvedBucket)
    .createSignedUrl(pathOrUrl, SIGNED_URL_DURATION);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
