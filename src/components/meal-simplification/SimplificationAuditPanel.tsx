import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Ban, Utensils, Apple, Egg, Sparkles } from "lucide-react";
import type { SimplicityIssue } from "@/lib/planSimplicityEngine";
import { getSeverityColor, getMealTypeLabel } from "@/lib/planSimplicityEngine";

interface SimplificationAuditPanelProps {
  issues: SimplicityIssue[];
  maxHeight?: string;
}

const ISSUE_ICONS: Record<string, React.ReactNode> = {
  blocked_food: <Ban className="w-3.5 h-3.5 text-red-500" />,
  excess_items: <Utensils className="w-3.5 h-3.5 text-amber-500" />,
  excess_fruits: <Apple className="w-3.5 h-3.5 text-pink-500" />,
  complex_breakfast: <Utensils className="w-3.5 h-3.5 text-orange-500" />,
  complex_snack: <Utensils className="w-3.5 h-3.5 text-orange-500" />,
  excess_protein_breakfast: <Egg className="w-3.5 h-3.5 text-red-400" />,
  premium_ingredient: <Sparkles className="w-3.5 h-3.5 text-purple-500" />,
  impractical_meal: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
  gourmet_combination: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
};

export default function SimplificationAuditPanel({ issues, maxHeight = "max-h-80" }: SimplificationAuditPanelProps) {
  if (issues.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
          <Utensils className="w-5 h-5 text-green-600" />
        </div>
        <p className="text-sm font-medium text-foreground">Nenhum problema encontrado</p>
        <p className="text-xs text-muted-foreground mt-1">O plano está dentro dos padrões de simplicidade</p>
      </div>
    );
  }

  // Group by severity
  const grouped = {
    critical: issues.filter(i => i.severity === "critical"),
    high: issues.filter(i => i.severity === "high"),
    medium: issues.filter(i => i.severity === "medium"),
    low: issues.filter(i => i.severity === "low"),
  };

  const severityLabels: Record<string, string> = {
    critical: "🔴 Crítico",
    high: "🟠 Alto",
    medium: "🟡 Médio",
    low: "🔵 Baixo",
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold">Auditoria de Simplicidade</span>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {issues.length} {issues.length === 1 ? "problema" : "problemas"}
        </Badge>
      </div>

      <ScrollArea className={maxHeight}>
        <div className="p-3 space-y-4">
          {(Object.entries(grouped) as [string, SimplicityIssue[]][]).map(([severity, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={severity} className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground px-1">
                  {severityLabels[severity]} ({items.length})
                </p>
                {items.map((issue, idx) => (
                  <div
                    key={`${issue.issueType}-${issue.mealType}-${idx}`}
                    className="rounded-lg border border-border p-2.5 space-y-1 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      {ISSUE_ICONS[issue.issueType] || <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium">{issue.message}</span>
                          <Badge variant="outline" className={`text-[9px] ${getSeverityColor(issue.severity)}`}>
                            -{issue.penaltyPoints}pts
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {getMealTypeLabel(issue.mealType)}
                          {issue.dayOfWeek != null && ` · Dia ${issue.dayOfWeek}`}
                        </p>
                        <p className="text-[10px] text-primary mt-0.5">
                          💡 {issue.suggestedFix}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
