import { Loader2 } from "lucide-react";

/**
 * PageLoader simplificado para o V1, sem vídeo ou splash async.
 */
export const PageLoader = () => (
  <div className="h-full w-full min-h-[200px] flex items-center justify-center">
    <Loader2 className="w-6 h-6 text-primary animate-spin" />
  </div>
);

export const BrainLoaderCard = ({ text }: { text?: string }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-4">
    <Loader2 className="w-8 h-8 text-primary animate-spin" />
    {text && <p className="text-sm text-muted-foreground">{text}</p>}
  </div>
);

export const BrainLoaderInline = ({ text }: { text?: string }) => (
  <span className="inline-flex items-center gap-2">
    <Loader2 className="w-4 h-4 text-primary animate-spin" />
    {text && <span className="text-xs text-muted-foreground">{text}</span>}
  </span>
);

export const BrainLoaderScreen = ({ visible }: { visible?: boolean }) => visible ? <PageLoader /> : null;

export default PageLoader;
