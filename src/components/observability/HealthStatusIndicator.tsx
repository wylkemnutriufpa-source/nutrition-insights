import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, AlertCircle, CheckCircle } from "lucide-react";

export function HealthStatusIndicator() {
  const { data: health } = useQuery({
    queryKey: ["system-health-summary"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_health_summary")
        .select("*")
        .single();
      return data;
    },
    refetchInterval: 30000,
  });

  const status = health?.status || "HEALTHY";

  const config = {
    HEALTHY: { color: "bg-green-500/20 text-green-500", icon: CheckCircle, label: "Saudável" },
    UNSTABLE: { color: "bg-yellow-500/20 text-yellow-500", icon: AlertCircle, label: "Instável" },
    CRITICAL: { color: "bg-red-500/20 text-red-500 animate-pulse", icon: HeartPulse, label: "Crítico" },
  }[status as "HEALTHY" | "UNSTABLE" | "CRITICAL"] || { color: "bg-muted", icon: CheckCircle, label: "Saudável" };

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`flex items-center gap-1.5 border-none ${config.color}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="text-[10px] font-bold tracking-tight uppercase\">${config.label}</span>
    </Badge>
  );
}
