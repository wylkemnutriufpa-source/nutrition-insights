import { Loader2 } from "lucide-react";

/**
 * PageLoader Original V1.
 * Simples, determinístico, sem animações metálicas ou splash screens.
 */
export const PageLoader = ({ text }: { text?: string }) => (
  <div className="h-full w-full min-h-[200px] flex flex-col items-center justify-center gap-3">
    <Loader2 className="w-8 h-8 text-primary animate-spin" />
    {text && <p className="text-sm text-muted-foreground font-medium">{text}</p>}
  </div>
);

export default PageLoader;
