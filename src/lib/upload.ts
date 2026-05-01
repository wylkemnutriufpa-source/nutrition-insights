import { supabase } from "@/integrations/supabase/client";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB default

interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  returnPath?: boolean;
}

/**
 * Sanitiza o nome do arquivo para evitar ataques de path traversal ou nomes maliciosos.
 */
function sanitizeFileName(name: string): string {
  const extension = name.split(".").pop();
  const baseName = name.substring(0, name.lastIndexOf(".")).replace(/[^a-z0-9]/gi, "_").toLowerCase();
  return `${baseName}.${extension}`;
}

/**
 * Upload a file to Supabase storage with security validation.
 */
export async function uploadFile({ bucket, path, file, returnPath = false }: UploadOptions): Promise<string | null> {
  // Validation: MIME Type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Tipo de arquivo não permitido: ${file.type}. Apenas imagens (jpg, png, webp) e PDF são aceitos.`);
  }

  // Validation: File Size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(2)}MB. O limite é 10MB.`);
  }

  const cleanFileName = sanitizeFileName(file.name);
  const fileName = `${path}/${crypto.randomUUID()}-${cleanFileName}`;
  
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
  
  if (error) {
    console.error(`[Storage:Upload] Error uploading to ${bucket}/${fileName}:`, error);
    throw error;
  }
  
  if (returnPath) return data.path;
  
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
}
