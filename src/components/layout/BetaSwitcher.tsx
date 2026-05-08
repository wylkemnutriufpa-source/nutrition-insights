import { useBetaMode } from "@/hooks/useBetaMode";
import { useAuth } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FlaskConical, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export function BetaSwitcher() {
  const { isBeta, toggleBeta } = useBetaMode();
  const { isNutritionist, isPersonal, isAdmin } = useAuth();

  // Only professionals see the beta switch
  if (!isNutritionist && !isPersonal && !isAdmin) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border shadow-sm">
      <div className="flex items-center gap-1.5 mr-1">
        {isBeta ? (
          <FlaskConical className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
        ) : (
          <Play className="w-3.5 h-3.5 text-green-500" />
        )}
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-wider",
          isBeta ? "text-amber-500" : "text-green-600"
        )}>
          {isBeta ? "Beta v2.0" : "Produção"}
        </span>
      </div>
      <Switch 
        checked={isBeta} 
        onCheckedChange={toggleBeta} 
        className="data-[state=checked]:bg-amber-500"
      />
    </div>
  );
}
