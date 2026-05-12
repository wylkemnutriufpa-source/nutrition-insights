import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveProtocolBadgeProps {
  patientId: string;
  className?: string;
  compact?: boolean;
}

interface ProtocolInfo {
  protocol_key: string | null;
  protocol_title: string;
  status: string;
  current_phase: string | null;
  manual_intervention_status: string;
  start_date: string;
}

const PROTOCOL_COLORS: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  fitjourney_master: { bg: "bg-primary/10 border-primary/30", text: "text-primary", icon: Sparkles },
  bikini_branco: { bg: "bg-pink-500/10 border-pink-500/30", text: "text-pink-600", icon: Zap },
};

export default function ActiveProtocolBadge({ patientId, className, compact = false }: ActiveProtocolBadgeProps) {
  const [protocol, setProtocol] = useState<ProtocolInfo | null>(null);

  useEffect(() => {
    if (!patientId) return;
    supabase
      .from("patient_protocols")
      .select("protocol_key, status, current_phase, manual_intervention_status, start_date, protocols(title)")
      .eq("patient_id", patientId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const d = data[0] as any;
          setProtocol({
            protocol_key: d.protocol_key,
            protocol_title: d.protocols?.title || "Protocolo",
            status: d.status,
            current_phase: d.current_phase,
            manual_intervention_status: d.manual_intervention_status || "none",
            start_date: d.start_date,
          });
        }
      });
  }, [patientId]);

  if (!protocol) {
    if (compact) return null;
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-dashed border-muted-foreground/30 text-[10px] text-muted-foreground", className)}>
        <Shield className="h-3 w-3" />
        Sem protocolo ativo
      </div>
    );
  }

  const colors = PROTOCOL_COLORS[protocol.protocol_key || ""] || { bg: "bg-muted/50 border-border", text: "text-foreground", icon: Shield };
  const Icon = colors.icon;
  const hasAdjustments = protocol.manual_intervention_status !== "none";

  const daysSinceStart = Math.floor((Date.now() - new Date(protocol.start_date).getTime()) / 86400000);

  const badge = (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium",
      colors.bg, colors.text,
      className,
    )}>
      <Icon className="h-3.5 w-3.5" />
      {compact ? (
        <span>{protocol.protocol_key === "fitjourney_master" ? "FJ Master" : protocol.protocol_key === "bikini_branco" ? "BB" : protocol.protocol_title}</span>
      ) : (
        <span>{protocol.protocol_title}</span>
      )}
      {protocol.current_phase && (
        <span className="opacity-70">• {protocol.current_phase}</span>
      )}
      {hasAdjustments && <span className="opacity-50">✎</span>}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-semibold">{protocol.protocol_title}</p>
            <p className="text-muted-foreground">Ativo há {daysSinceStart} dia{daysSinceStart !== 1 ? "s" : ""}</p>
            {protocol.current_phase && <p className="text-muted-foreground">Fase atual: {protocol.current_phase}</p>}
            {hasAdjustments && <p className="text-muted-foreground">⚠ Com ajustes manuais do profissional</p>}
            <p className="text-muted-foreground">Automação clínica monitorando em background</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
