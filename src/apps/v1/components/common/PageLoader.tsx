import { Loader2 } from "lucide-react";

/**
 * PageLoader simplificado para o V1, sem vídeo ou splash async.
 */
export const PageLoader = () => (
  <div className="h-full w-full min-h-[200px] flex items-center justify-center">
    <Loader2 className="w-6 h-6 text-primary animate-spin" />
  </div>
);

export default PageLoader;
