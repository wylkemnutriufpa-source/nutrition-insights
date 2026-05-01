import { supabase } from "@/integrations/supabase/client";

/**
 * Clinical buckets that are private and require signed URLs.
 */
const PRIVATE_BUCKETS = ["body-images", "checkin-photos", "enrollment-photos", "meal-images", "patient-documents"];

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateFile(file: File) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Segurança: Tipo de arquivo '${file.type}' não permitido.`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Segurança: Arquivo excede o limite de 10MB.`);
  }
}

function sanitizePath(path: string): string {
  return path.replace(/[<>:"|?*]/g, "_"); // Basic sanitization for path segments
}

/**
 * Upload a file to a storage bucket and return its path (NOT a public URL).
 * For private buckets, store the path and use getSignedUrl() to access.
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  file: File,
  options?: { upsert?: boolean }
): Promise<{ path: string; error: Error | null }> {
  try {
    validateFile(file);
    const safePath = sanitizePath(path);

    const { error } = await supabase.storage.from(bucket).upload(safePath, file, {
      upsert: options?.upsert ?? false,
    });

    if (error) return { path: "", error };
    return { path: safePath, error: null };
  } catch (err) {
    return { path: "", error: err as Error };
  }
}

/**
 * Get a usable URL for a storage file.
 * For private buckets: creates a signed URL (valid 1 hour).
 * For public buckets: returns the public URL.
 */
export async function getStorageUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!path) return null;

  if (PRIVATE_BUCKETS.includes(bucket)) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload a file and immediately return a signed/public URL.
 * Convenience wrapper for upload → get URL flow.
 */
export async function uploadAndGetUrl(
  bucket: string,
  path: string,
  file: File,
  options?: { upsert?: boolean; expiresIn?: number }
): Promise<string | null> {
  const { error } = await uploadToStorage(bucket, path, file, options);
  if (error) throw error;
  return getStorageUrl(bucket, path, options?.expiresIn);
}
