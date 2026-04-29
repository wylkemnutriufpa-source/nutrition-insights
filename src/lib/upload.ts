import { supabase } from "@/integrations/supabase/client";

interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  returnPath?: boolean;
}

/**
 * Upload a file to Supabase storage without automatic retries.
 * Returns the public URL or the path depending on returnPath option.
 */
export async function uploadFile({ bucket, path, file, returnPath = false }: UploadOptions): Promise<string | null> {
  const fileName = `${path}/${crypto.randomUUID()}-${file.name}`;
  
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
  
  if (error) {
    console.error(`[Storage:Upload] Error uploading to ${bucket}/${fileName}:`, error);
    throw error;
  }
  
  if (returnPath) return data.path;
  
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
}
