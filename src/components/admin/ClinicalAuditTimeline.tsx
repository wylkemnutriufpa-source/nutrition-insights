import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  History, 
  Dna, 
  Binary, 
  Settings2, 
  ChevronRight,
  FileText,
  Table,
  Filter,
  Download,
  FileDown
} from "lucide-react";
import { generateClinicalAuditPDF } from "@/lib/pdfExport";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface ClinicalAuditTimelineProps {
  patientId: string;
}

export function ClinicalAuditTimeline({ patientId }: ClinicalAuditTimelineProps) {
  const [period, setPeriod] = useState("30");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["clinical-audit", patientId, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinical_audit_logs")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const { data: plans } = useQuery({
    queryKey: ["patient-meal-plans", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Unify events for timeline
  const events = [
    ...(logs || []).map(l => {
      const metadata = (l.action_metadata as any) || {};
      return {
        id: l.id,
        type: 'audit',
        action: l.action_type,
        date: new Date(l.created_at),
        metadata,
        protocol: metadata.protocol || 'V3',
        version: metadata.engine_version || '3.1.0'
      };
    }),
    ...(plans || []).map(p => ({
      id: p.id,
      type: 'plan',
      action: 'Plano Alimentar Gerado',
      date: new Date(p.created_at),
      metadata: p.generation_metadata,
      protocol: p.generation_source || 'default',
      version: p.engine_version || '3.1.0',
      plan_version: p.plan_version
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const exportCSV = () => {
    const headers = ["Data", "Evento", "Protocolo", "Versão Engine", "Versão Plano", "Metadados"];
    const rows = events.map(e => [
      format(e.date, "dd/MM/yyyy HH:mm:ss"),
      e.action,
      e.protocol,
      e.version,
      (e as any).plan_version || "N/A",
      JSON.stringify(e.metadata)
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `clinical_audit_${patientId}_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    generateClinicalAuditPDF({
      patientName: "Paciente Auditado", // In production, fetch from profile
      events: events.map(e => ({
        action: e.action,
        date: e.date,
        protocol: e.protocol,
        version: e.version,
        metadata: e.metadata
      }))
    });
  };

  return (
    <Card className="bg-background border-border/50 shadow-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/10 bg-muted/30 pb-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-emerald-500" />
          <CardTitle className="text-lg font-bold">Histórico Clínico Determinístico</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-background/50">
              <Filter className="h-3 w-3 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-2" onClick={exportCSV}>
            <Download className="h-3 w-3" />
            CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-2 bg-emerald-500/10 text-emerald-500 border-emerald-500/20" onClick={exportPDF}>
            <FileDown className="h-3 w-3" />
            PDF Premium
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative p-6">
          <div className="absolute left-[47px] top-6 bottom-6 w-px bg-gradient-to-b from-emerald-500/50 via-border to-transparent" />
          
          <div className="space-y-8">
            {events.map((event, idx) => (
              <div key={event.id} className="relative flex gap-6 group">
                <div className={cn(
                  "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 bg-background shadow-lg transition-transform group-hover:scale-110",
                  event.type === 'plan' ? "border-emerald-500 text-emerald-500" : "border-blue-500 text-blue-500"
                )}>
                  {event.type === 'plan' ? <Dna className="h-5 w-5" /> : <Settings2 className="h-5 w-5" />}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{event.action}</span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 uppercase font-mono tracking-tighter bg-emerald-500/10 text-emerald-500 border-none">
                        {event.protocol}
                      </Badge>
                    </div>
                    <time className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/50">
                      {format(event.date, "dd MMM yyyy • HH:mm", { locale: ptBR })}
                    </time>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    <div className="flex items-center gap-1.5">
                      <Binary className="h-3 w-3" />
                      Engine v{event.version}
                    </div>
                    {(event as any).plan_version && (
                      <div className="flex items-center gap-1.5 border-l border-border/50 pl-4">
                        <FileText className="h-3 w-3" />
                        Plan v{(event as any).plan_version}
                      </div>
                    )}
                  </div>

                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border/10 overflow-hidden">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-muted-foreground/70 uppercase">Decisões Clínicas</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        {Object.entries(event.metadata).map(([key, value]) => {
                          if (typeof value === 'object') return null;
                          return (
                            <div key={key} className="flex items-center justify-between py-1 border-b border-border/5 last:border-0">
                              <span className="text-[10px] text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className="text-[10px] font-mono text-foreground font-semibold">{String(value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
