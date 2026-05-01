const ALLOWED_ORIGINS = [
  "https://fitjourney.com.br",
  "http://localhost:8080",
  "http://localhost:5173",
];

export const getCorsHeaders = (origin: string | null) => {
  let allowedOrigin = "https://fitjourney.com.br"; // Safe default
  
  if (origin) {
    const isLovablePreview = origin.endsWith(".lovableproject.com");
    const isProduction = origin === "https://fitjourney.com.br";
    const isLocal = origin.startsWith("http://localhost");

    if (isProduction || isLovablePreview || isLocal) {
      allowedOrigin = origin;
    }
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS, DELETE",
    "Vary": "Origin", // Important when using dynamic Access-Control-Allow-Origin
  };
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

