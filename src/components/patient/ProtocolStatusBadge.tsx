import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, ShieldAlert, Pause, XCircle, Wrench, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProtocolStatusBadgeProps {
  status: string;
  manualInterventionStatus?: string;
  lastManualInterventionAt?: string | null;
  manualAdjustmentsCount?: number;
  className?: string;
  showDetails?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: string; color: string }> = {
  active: { label: "Protocolo Ativo", icon: Shield, variant: "default", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" },
  paused: { label: "Protocolo Pausado", icon: Pause, variant: "secondary", color: "text-amber-600 bg-amber-500/10 border-amber-500/30" },
  cancelled: { label: "Protocolo Cancelado", icon: XCircle, variant: "destructive", color: "text-destructive bg-destructive/10 border-destructive/30" },
  completed: { label: "Protocolo Concluído", icon: CheckCircle2, variant: "outline", color: "text-muted-foreground bg-muted/50 border-muted-foreground/20" },
};

const INTERVENTION_LABELS: Record<string, string> = {
  none: "",
  adjusted_within_protocol: "Com ajustes manuais",
  overridden_temporarily: "Override temporário",
  custom_manual_layer: "Camada manual personalizada",
};

export default function ProtocolStatusBadge({
  status,
  manualInterventionStatus = "none",
  lastManualInterventionAt,
  manualAdjustmentsCount = 0,
  className,
  showDetails = true,
}: ProtocolStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const Icon = manualInterventionStatus !== "none" && status === "active" ? Wrench : config.icon;
  const hasManualAdjustments = manualInterventionStatus !== "none" && status === "active";

  const badgeContent = (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium",
      config.color,
      className
    )}>
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
      {hasManualAdjustments && (
        <span className="opacity-70">• {INTERVENTION_LABELS[manualInterventionStatus]}</span>
      )}
    </div>
  );

  if (!showDetails || !hasManualAdjustments) return badgeContent;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-semibold">Protocolo ativo com ajustes manuais</p>
            <p className="text-muted-foreground">
              O profissional fez {manualAdjustmentsCount} ajuste(s) manual(is).
              A automação clínica continua monitorando este paciente.
            </p>
            {lastManualInterventionAt && (
              <p className="text-muted-foreground">
                Último ajuste: {formatDistanceToNow(new Date(lastManualInterventionAt), { addSuffix: true, locale: ptBR })}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
