import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle2, Search, Code, FileText, Database } from "lucide-react";

interface ForensicSnapshotViewerProps {
  snapshot: any;
  planId: string;
}

export function ForensicSnapshotViewer({ snapshot, planId }: ForensicSnapshotViewerProps) {
  if (!snapshot) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-destructive/20 rounded-2xl bg-destructive/5">
        <Shield className="w-12 h-12 mx-auto mb-4 text-destructive opacity-40" />
        <h3 className="text-lg font-bold text-destructive">Snapshot Ausente</h3>
        <p className="text-sm text-muted-foreground">Este plano não possui um snapshot soberano persistido.</p>
      </div>
    );
  }

  const issues: string[] = [];
  const checks = {
    version: snapshot.snapshot_version === 'v3',
    days: Array.isArray(snapshot.days) && snapshot.days.length > 0,
    images: true,
    macros: true,
  };

  if (checks.days) {
    snapshot.days.forEach((day: any, dIdx: number) => {
      if (!day.meals || day.meals.length === 0) {
        issues.push(`Dia ${day.day_of_week}: Sem refeições`);
      } else {
        day.meals.forEach((meal: any, mIdx: number) => {
          if (!meal.items || meal.items.length === 0) {
            issues.push(`Dia ${day.day_of_week} / ${meal.name}: Sem itens`);
          } else {
            meal.items.forEach((item: any) => {
              // 🔪 LEITURA DIRETA: snapshot.imageUrl (sem visual.image_url)
              const hasImage = item.imageUrl || item.image_url || item.image || item.visual?.image_url;
              if (!hasImage) checks.images = false;
              if (!item.macros || item.macros.kcal === 0) checks.macros = false;
            });
          }
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <DiagnosticCard 
          label="Soberania V3" 
          status={checks.version ? "success" : "error"} 
          icon={<Shield className="w-4 h-4" />} 
        />
        <DiagnosticCard 
          label="Fidelidade Visual" 
          status={checks.images ? "success" : "warning"} 
          icon={<FileText className="w-4 h-4" />} 
        />
        <DiagnosticCard 
          label="Cálculo Persistido" 
          status={checks.macros ? "success" : "error"} 
          icon={<Database className="w-4 h-4" />} 
        />
        <DiagnosticCard 
          label="Estrutura de Dias" 
          status={checks.days ? "success" : "error"} 
          icon={<CheckCircle2 className="w-4 h-4" />} 
        />
      </div>

      {issues.length > 0 && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-2 text-destructive font-bold mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Violações Arquiteturais Detectadas</span>
          </div>
          <ul className="text-xs space-y-1 text-destructive/80">
            {issues.map((issue, i) => <li key={i}>• {issue}</li>)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <LabelWithIcon icon={<Code className="w-4 h-4" />} label="Raw Snapshot (JSON)" />
            <Badge variant="outline" className="font-mono text-[10px]">V3_CORE_SNAPSHOT</Badge>
          </div>
          <ScrollArea className="h-[400px] w-full rounded-xl border border-border/10 bg-black/40 p-4 font-mono text-[10px] text-primary/80">
            <pre>{JSON.stringify(snapshot, null, 2)}</pre>
          </ScrollArea>
        </div>

        <div className="space-y-2">
          <LabelWithIcon icon={<Search className="w-4 h-4" />} label="Metadata de Auditoria" />
          <div className="p-4 rounded-xl border border-border/10 bg-muted/5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">ID do Plano</p>
                <p className="text-xs font-mono truncate">{planId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">Data de Geração</p>
                <p className="text-xs font-mono">{snapshot.created_at || "N/A"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase">Constituição Soberana</p>
              <div className="p-3 rounded-lg bg-black/20 text-[10px] space-y-1 italic text-muted-foreground">
                <p>"O frontend nunca pensa. O snapshot já nasce pensando."</p>
                <p>"Nenhum componente do sistema pode inferir ou recalcular dados clínicos fora do pipeline soberano."</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiagnosticCard({ label, status, icon }: { label: string; status: "success" | "warning" | "error"; icon: React.ReactNode }) {
  const colors = {
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-500",
    error: "bg-destructive/10 border-destructive/20 text-destructive",
  };

  return (
    <div className={`p-3 rounded-xl border flex items-center gap-3 ${colors[status]}`}>
      <div className="p-1.5 rounded-lg bg-current/10">
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase opacity-60 font-bold">{label}</p>
        <p className="text-xs font-bold">{status === "success" ? "Validado" : status === "warning" ? "Alerta" : "Falhou"}</p>
      </div>
    </div>
  );
}

function LabelWithIcon({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
  );
}
