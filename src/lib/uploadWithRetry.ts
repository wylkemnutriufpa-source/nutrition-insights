import { supabase } from "@/integrations/supabase/client";

interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  maxRetries?: number;
  onProgress?: (attempt: number, maxRetries: number) => void;
  /** If true, returns the storage path instead of a signed/public URL. Default: false */
  returnPath?: boolean;
}

/**
 * Upload a file to storage with exponential backoff retry.
 * By default returns a signed URL (private buckets) or public URL.
 * Set returnPath=true to get the raw storage path (for persisting in DB).
 */
export async function uploadWithRetry({
  bucket,
  path,
  file,
  maxRetries = 3,
  onProgress,
  returnPath = false,
}: UploadOptions): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const filePath = `${path}/${Date.now()}.${ext}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    onProgress?.(attempt, maxRetries);

    const { error } = await supabase.storage.from(bucket).upload(filePath, file);

    if (!error) {
      if (returnPath) return filePath;
      // For temporary use (e.g. sending to AI), return signed URL
      const { getStorageUrl } = await import("@/lib/storageUtils");
      return getStorageUrl(bucket, filePath);
    }

    // Don't retry on auth or validation errors
    if (error.message?.includes("401") || error.message?.includes("403")) {
      throw new Error("Sem permissão para upload: " + error.message);
    }

    if (attempt < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
      await new Promise((r) => setTimeout(r, delay));
    } else {
      throw new Error(`Upload falhou após ${maxRetries} tentativas: ${error.message}`);
    }
  }

  return null;
}
