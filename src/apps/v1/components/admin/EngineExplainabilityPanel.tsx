import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Target, 
  Scale, 
  ShieldCheck, 
  Info,
  ChevronRight,
  Flame,
  BrainCircuit
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExplainabilityPanelProps {
  metadata: {
    calories_target?: number;
    protein_target?: number;
    carbs_target?: number;
    fat_target?: number;
    protocol?: string;
    restrictions_applied?: string[];
    strategy_version?: string;
    clinical_rationale?: string;
    score?: number;
  };
}

export function EngineExplainabilityPanel({ metadata }: ExplainabilityPanelProps) {
  return (
    <Card className="border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between bg-emerald-500/5 border-b border-emerald-500/10 pb-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-emerald-500" />
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Racional Clínico (Explainability)</CardTitle>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-mono">
          Strategy: {metadata.protocol || 'Default V3'}
        </Badge>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Why this plan? */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
            <Info className="h-3 w-3" />
            Por que esse plano foi gerado?
          </div>
          <p className="text-sm text-foreground leading-relaxed italic border-l-2 border-emerald-500/30 pl-4 py-1">
            {metadata.clinical_rationale || "Plano otimizado para equilíbrio nutricional baseado nas metas antropométricas e restrições detectadas."}
          </p>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/10">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
              <Flame className="h-3 w-3 text-orange-500" />
              Calorias Alvo
            </div>
            <div className="text-lg font-mono font-bold">{metadata.calories_target || 0} <span className="text-[10px] text-muted-foreground">kcal</span></div>
          </div>

          <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/10">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
              <Target className="h-3 w-3 text-emerald-500" />
              Score Clínico
            </div>
            <div className="text-lg font-mono font-bold text-emerald-500">{metadata.score || 100}%</div>
          </div>
        </div>

        {/* Macro Distribution */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
            <Scale className="h-3 w-3" />
            Distribuição de Macros
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Prot', value: metadata.protein_target, color: 'bg-red-500' },
              { label: 'Carb', value: metadata.carbs_target, color: 'bg-blue-500' },
              { label: 'Gord', value: metadata.fat_target, color: 'bg-yellow-500' }
            ].map(macro => (
              <div key={macro.label} className="p-2 rounded bg-background border border-border/5 text-center">
                <div className="text-[10px] text-muted-foreground uppercase mb-1">{macro.label}</div>
                <div className="text-xs font-mono font-bold">{macro.value || 0}g</div>
                <div className={cn("h-1 w-full mt-2 rounded-full opacity-30", macro.color)} />
              </div>
            ))}
          </div>
        </div>

        {/* Restrictions */}
        {metadata.restrictions_applied && metadata.restrictions_applied.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              Restrições Aplicadas
            </div>
            <div className="flex flex-wrap gap-2">
              {metadata.restrictions_applied.map(res => (
                <Badge key={res} variant="secondary" className="text-[10px] bg-muted text-muted-foreground border-none">
                  {res}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
