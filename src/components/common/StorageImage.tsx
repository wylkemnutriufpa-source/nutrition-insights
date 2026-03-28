/**
 * StorageImage — Renders an image from a storage path or URL.
 * Automatically resolves paths to signed URLs for private buckets.
 * Handles legacy full URLs transparently.
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_DURATION = 3600;
const RENEWAL_BUFFER = 600;

function isPath(value: string): boolean {
  return !value.startsWith("http://") && !value.startsWith("https://") && !value.startsWith("blob:");
}

function detectBucket(path: string): string {
  if (path.includes("body/") || path.includes("branding/")) return "body-images";
  if (path.includes("lab-exams/") || path.includes("patient-documents")) return "patient-documents";
  if (path.includes("enrollment")) return "enrollment-photos";
  if (path.includes("meal")) return "meal-images";
  return "checkin-photos";
}

interface StorageImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  bucket?: string;
  fallback?: React.ReactNode;
}

export default function StorageImage({ src: pathOrUrl, bucket, fallback, ...imgProps }: StorageImageProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const renewalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pathOrUrl) {
      setResolvedUrl(null);
      return;
    }

    if (!isPath(pathOrUrl)) {
      setResolvedUrl(pathOrUrl);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const resolve = async () => {
      const resolvedBucket = bucket || detectBucket(pathOrUrl);
      const { data, error } = await supabase.storage
        .from(resolvedBucket)
        .createSignedUrl(pathOrUrl, SIGNED_URL_DURATION);

      if (!cancelled) {
        setResolvedUrl(data?.signedUrl || null);
        setLoading(false);

        // Log clinical file access (fire-and-forget)
        if (data?.signedUrl) {
          supabase.from("clinical_file_access_log" as any).insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            bucket: resolvedBucket,
            file_path: pathOrUrl,
            access_type: "view",
          }).then(() => {});
        }

        // Auto-renew before expiry
        renewalTimer.current = setTimeout(resolve, (SIGNED_URL_DURATION - RENEWAL_BUFFER) * 1000);
      }
    };

    resolve();

    return () => {
      cancelled = true;
      if (renewalTimer.current) clearTimeout(renewalTimer.current);
    };
  }, [pathOrUrl, bucket]);

  if (!pathOrUrl || (!resolvedUrl && !loading)) {
    return fallback ? <>{fallback}</> : null;
  }

  if (loading) {
    return (
      <div className={imgProps.className} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return <img {...imgProps} src={resolvedUrl!} />;
}
