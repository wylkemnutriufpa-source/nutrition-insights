import { useOnlinePatients } from "@/hooks/useOnlinePatients";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UsersRound, Crown } from "lucide-react";

interface OnlinePatientsWidgetProps {
  variant?: "card" | "badge" | "inline";
  showPremiumTag?: boolean;
}

export default function OnlinePatientsWidget({ variant = "card", showPremiumTag = true }: OnlinePatientsWidgetProps) {
  const { onlineCount, loading } = useOnlinePatients();

  if (variant === "badge") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-primary">{loading ? "..." : onlineCount}</span>
              <Wifi className="w-3 h-3 text-primary" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{onlineCount} paciente{onlineCount !== 1 ? "s" : ""} online agora</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="text-sm font-medium">{loading ? "..." : onlineCount}</span>
        <span className="text-xs text-muted-foreground">online</span>
      </div>
    );
  }

  return (
    <Card className="glass shadow-card border-primary/20 relative overflow-hidden">
      {showPremiumTag && (
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="text-[10px] gap-1 border-amber-400/50 text-amber-500">
            <Crown className="w-3 h-3" /> Premium
          </Badge>
        </div>
      )}
      <CardContent className="py-5 flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Wifi className="w-6 h-6 text-primary" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-background" />
          </span>
        </div>
        <div>
          <p className="text-3xl font-bold font-display text-primary">
            {loading ? "..." : onlineCount}
          </p>
          <p className="text-xs text-muted-foreground">
            Paciente{onlineCount !== 1 ? "s" : ""} online agora
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
