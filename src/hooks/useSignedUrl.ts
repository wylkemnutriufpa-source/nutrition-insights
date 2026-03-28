/**
 * useSignedUrl — Resolves a storage path to a signed URL with auto-renewal.
 * 
 * Handles both legacy full URLs and new path-based storage references.
 * Auto-renews signed URLs before expiry (renews at 50min for 1h URLs).
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const PRIVATE_BUCKETS = ["body-images", "checkin-photos", "enrollment-photos", "meal-images", "patient-documents"];
const SIGNED_URL_DURATION = 3600; // 1 hour
const RENEWAL_BUFFER = 600; // Renew 10 min before expiry

function isPath(value: string): boolean {
  return !value.startsWith("http://") && !value.startsWith("https://") && !value.startsWith("blob:");
}

function detectBucket(path: string): string {
  // Try to infer bucket from path patterns
  if (path.includes("body/") || path.includes("branding/")) return "body-images";
  if (path.includes("lab-exams/")) return "patient-documents";
  return "checkin-photos"; // default for checkin/enrollment paths
}

/**
 * Resolve a storage path or URL to a displayable URL.
 * If it's already a full URL, returns as-is. If it's a path, generates a signed URL.
 */
export async function resolveStorageUrl(
  pathOrUrl: string | null | undefined,
  bucket?: string
): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (!isPath(pathOrUrl)) return pathOrUrl; // Already a URL

  const resolvedBucket = bucket || detectBucket(pathOrUrl);
  const { data, error } = await supabase.storage
    .from(resolvedBucket)
    .createSignedUrl(pathOrUrl, SIGNED_URL_DURATION);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Hook version — returns a signed URL for a path, with auto-renewal.
 */
export function useSignedUrl(
  pathOrUrl: string | null | undefined,
  bucket?: string
): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const renewalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pathOrUrl) {
      setUrl(null);
      return;
    }

    if (!isPath(pathOrUrl)) {
      setUrl(pathOrUrl);
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      const signed = await resolveStorageUrl(pathOrUrl, bucket);
      if (!cancelled) {
        setUrl(signed);
        // Schedule renewal
        renewalTimer.current = setTimeout(resolve, (SIGNED_URL_DURATION - RENEWAL_BUFFER) * 1000);
      }
    };

    resolve();

    return () => {
      cancelled = true;
      if (renewalTimer.current) clearTimeout(renewalTimer.current);
    };
  }, [pathOrUrl, bucket]);

  return url;
}

/**
 * Batch resolve multiple paths to signed URLs.
 */
export async function resolveStorageUrls(
  items: Array<{ path: string | null; bucket?: string }>
): Promise<Array<string | null>> {
  return Promise.all(
    items.map((item) => resolveStorageUrl(item.path, item.bucket))
  );
}
