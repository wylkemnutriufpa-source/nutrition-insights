import { Loader2 } from "lucide-react";

export const V1LoadingFallback = () => (
  <div className="h-screen w-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">FitJourney</span>
    </div>
  </div>
);
