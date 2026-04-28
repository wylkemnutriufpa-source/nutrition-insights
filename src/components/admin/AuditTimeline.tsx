import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Link as LinkIcon, 
  RefreshCcw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert,
  Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AuditTimelineProps {
  correlationId: string;
}

export function AuditTimeline({ correlationId }: AuditTimelineProps) {
  const { data: events, isLoading } = useQuery({
    queryKey: ["audit-timeline", correlationId],
    queryFn: async () => {
      // Fetch events with the same correlation_id OR where parent_correlation_id matches
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .or(`correlation_id.eq.${correlationId},parent_correlation_id.eq.${correlationId}`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!correlationId
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const getEventIcon = (action: string, status: string) => {
    if (status === 'blocked') return <ShieldAlert className="h-4 w-4 text-amber-500" />;
    if (status === 'error') return <XCircle className="h-4 w-4 text-destructive" />;
    
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('linkage') || lowerAction.includes('vínculo')) return <LinkIcon className="h-4 w-4 text-blue-500" />;
    if (lowerAction.includes('sync') || lowerAction.includes('sinc')) return <RefreshCcw className="h-4 w-4 text-emerald-500" />;
    if (lowerAction.includes('critical') || lowerAction.includes('fail')) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted-foreground/20">
      {events?.map((event, index) => (
        <div key={event.id} className="relative group">
          {/* Timeline Dot */}
          <div className={cn(
            "absolute -left-[25px] top-1 w-4 h-4 rounded-full border-2 border-background z-10 transition-transform group-hover:scale-125",
            event.status === 'error' ? "bg-destructive" : 
            event.status === 'blocked' ? "bg-amber-500" : "bg-emerald-500"
          )} />
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {format(new Date(event.created_at), "HH:mm:ss.SSS", { locale: ptBR })}
              </span>
              <div className="flex items-center gap-1.5">
                {getEventIcon(event.action, event.status)}
                <span className="text-sm font-bold tracking-tight">{event.action}</span>
              </div>
              <Badge variant="outline" className={cn(
                "text-[10px] py-0 h-4 border-none font-bold uppercase",
                event.status === 'success' ? "text-emerald-500 bg-emerald-500/10" :
                event.status === 'error' ? "text-destructive bg-destructive/10" :
                "text-amber-500 bg-amber-500/10"
              )}>
                {event.status}
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground leading-relaxed">
              {event.resource_type} {event.resource_id ? `(${event.resource_id})` : ""}
            </p>

            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <div className="mt-2 hidden group-hover:block transition-all duration-300">
                <pre className="text-[10px] bg-slate-900 text-slate-300 p-2 rounded-lg border border-white/5 overflow-x-auto max-h-32">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      ))}

      {events?.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 italic">
          Nenhum evento correlacionado encontrado.
        </p>
      )}
    </div>
  );
}
