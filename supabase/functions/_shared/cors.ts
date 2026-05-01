const ALLOWED_ORIGINS = [
  "https://fitjourney.com.br",
  "http://localhost:8080",
  "http://localhost:5173",
];

export const getCorsHeaders = (origin: string | null) => {
  let allowedOrigin = "*"; // Default to * but we will try to be more specific
  
  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".lovableproject.com")) {
      allowedOrigin = origin;
    } else {
      // In production, we might want to be even stricter
      // For now, let's allow it but return the specific origin if it matches our pattern
      allowedOrigin = "https://fitjourney.com.br"; 
    }
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS, DELETE",
  };
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Legacy fallback, prefer getCorsHeaders(req.headers.get("origin"))
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS, DELETE",
};
