import { useEffect, useState } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Shield, CheckCircle2, AlertTriangle, Clock, ListChecks, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { Badge } from "@v1/components/ui/badge";

interface AuditLog {
  id: string;
  created_at: string;
  event_type: string;
  metadata: any;
}

export function DeterministicAuditLog({ patientId }: { patientId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) {
      loadLogs();
    }
  }, [patientId]);

  async function loadLogs() {
    setLoading(true);
    const { data, error } = await supabase
      .from("clinical_engine_audit_logs")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setLogs(data as AuditLog[]);
    }
    setLoading(false);
  }

  if (loading) return <div className="p-8 text-center animate-pulse text-muted-foreground">Carregando trilha de auditoria...</div>;

  return (
    <Card className="border-border/40 bg-card/30">
      <CardHeader className="pb-3 border-b border-border/10">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Auditoria do Motor Determinístico (Sem IA)
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Trilha de execução de regras clínicas e filtros de segurança aplicados automaticamente.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-4">
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma execução registrada para este paciente.</p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="relative pl-6 pb-4 border-l border-border/40 last:pb-0">
                  <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-primary/40 border-2 border-background" />
                  
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary/80">
                        {log.event_type.replace(/_/g, " ")}
                      </span>
                      {log.metadata?.no_ai_guarantee && (
                        <Badge variant="outline" className="text-[9px] h-4 border-primary/30 text-primary font-bold bg-primary/5">
                          100% DETERMINÍSTICO
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(log.created_at), "HH:mm:ss", { locale: ptBR })}
                    </span>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-2 text-xs border border-border/50">
                    {log.event_type === "filter_plan_type" && (
                      <p>Filtro rígido aplicado: apenas itens do tipo <strong>{log.metadata.expected}</strong> permitidos ({log.metadata.items_after} de {log.metadata.items_before} itens).</p>
                    )}
                    {log.event_type === "meal_selected" && (
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                          {log.metadata.meal_type}: {log.metadata.title}
                        </p>
                        <div className="flex gap-2 text-[10px] text-muted-foreground">
                          <span>Score: {log.metadata.score}/100</span>
                          <span>•</span>
                          <span>Meta: {log.metadata.target_kcal} kcal</span>
                          <span>•</span>
                          <span>Fator Escala: x{log.metadata.scale_factor}</span>
                        </div>
                      </div>
                    )}
                    {log.event_type === "critical_failure" && (
                      <p className="text-destructive font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Falha Crítica: {log.metadata.reason}
                      </p>
                    )}
                    {(!["filter_plan_type", "meal_selected", "critical_failure"].includes(log.event_type)) && (
                      <pre className="whitespace-pre-wrap font-mono text-[9px] opacity-70">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
