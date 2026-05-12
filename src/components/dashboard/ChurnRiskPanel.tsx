import { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  UserX, Clock, ArrowRight, Send, Calendar, FileText,
  AlertTriangle, TrendingDown, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface ChurnPatient {
  id: string;
  name: string;
  score: number;
  risks: string[];
  lastActivity?: string;
  checklistCompletion?: number;
  mealsCount?: number;
  streak?: number;
}

export interface ChurnResult {
  patient: ChurnPatient;
  churnScore: number;
  level: "low" | "moderate" | "high";
  daysInactive: number;
  suggestedAction: string;
}

export function calculateChurnRisk(patients: ChurnPatient[]): ChurnResult[] {
  return patients.map(p => {
    let churnScore = 0;

    // Days inactive (0-35 pts)
    const daysInactive = p.lastActivity
      ? Math.floor((Date.now() - new Date(p.lastActivity).getTime()) / 86400000)
      : 30;
    if (daysInactive >= 7) churnScore += 35;
    else if (daysInactive >= 4) churnScore += 25;
    else if (daysInactive >= 2) churnScore += 10;

    // Adherence drop (0-30 pts)
    const adherence = p.checklistCompletion ?? p.score;
    if (adherence < 20) churnScore += 30;
    else if (adherence < 40) churnScore += 20;
    else if (adherence < 60) churnScore += 10;

    // Lost streak (0-15 pts)
    if (p.streak === 0 && (p.mealsCount ?? 0) > 0) churnScore += 15;

    // No meals (0-10 pts)
    if ((p.mealsCount ?? 0) === 0) churnScore += 10;

    // Risk flags (0-10 pts)
    if (p.risks.includes("Sem registros")) churnScore += 5;
    if (p.risks.includes("Insatisfeito")) churnScore += 5;

    churnScore = Math.min(100, churnScore);

    const level: ChurnResult["level"] =
      churnScore >= 60 ? "high" : churnScore >= 30 ? "moderate" : "low";

    const suggestedAction =
      churnScore >= 60
        ? "Enviar mensagem motivacional e agendar consulta"
        : churnScore >= 40
        ? "Revisar plano alimentar e reforçar metas"
        : churnScore >= 30
        ? "Agendar consulta de acompanhamento"
        : "Manter acompanhamento regular";

    return { patient: p, churnScore, level, daysInactive, suggestedAction };
  })
    .filter(r => r.churnScore >= 20)
    .sort((a, b) => b.churnScore - a.churnScore);
}

const levelConfig = {
  high: { label: "Alto Risco", bg: "bg-destructive/10 border-destructive/20", text: "text-destructive", dot: "bg-destructive", barColor: "bg-destructive" },
  moderate: { label: "Moderado", bg: "bg-warning/10 border-warning/20", text: "text-warning", dot: "bg-warning", barColor: "bg-warning" },
  low: { label: "Baixo Risco", bg: "bg-success/10 border-success/20", text: "text-success", dot: "bg-success", barColor: "bg-success" },
};

export default function ChurnRiskPanel({ patients, loading }: { patients: ChurnPatient[]; loading?: boolean }) {
  const navigate = useNavigate();
  const churnResults = useMemo(() => calculateChurnRisk(patients), [patients]);

  const highCount = churnResults.filter(r => r.level === "high").length;
  const modCount = churnResults.filter(r => r.level === "moderate").length;

  if (loading) {
    return (
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserX className="w-5 h-5 text-destructive animate-pulse" />
          <h2 className="font-display font-semibold">Risco de Abandono</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <UserX className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <h2 className="font-display font-semibold">Risco de Abandono</h2>
            <p className="text-xs text-muted-foreground">
              {churnResults.length > 0
                ? `${churnResults.length} paciente${churnResults.length > 1 ? "s" : ""} em risco`
                : "Todos os pacientes engajados ✅"}
            </p>
          </div>
        </div>
        {highCount > 0 && (
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-destructive/20 text-destructive animate-pulse">
            {highCount} crítico{highCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {churnResults.length === 0 ? (
        <div className="text-center py-6">
          <Shield className="w-8 h-8 text-success mx-auto mb-2 opacity-60" />
          <p className="text-sm text-muted-foreground">Nenhum paciente em risco de abandono. 🎉</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {churnResults.slice(0, 6).map((result, i) => {
            const cfg = levelConfig[result.level];
            return (
              <motion.div
                key={result.patient.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`rounded-lg border p-3.5 cursor-pointer hover:shadow-card transition-all ${cfg.bg}`}
                onClick={() => navigate(`/patients/${result.patient.id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{result.patient.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cfg.text} bg-card`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1`} />
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {result.daysInactive === 0 ? "Hoje" : `${result.daysInactive}d inativo`}
                      </span>
                      <span>
                        Adesão: <b className={result.patient.score < 50 ? "text-destructive" : "text-foreground"}>
                          {result.patient.checklistCompletion ?? result.patient.score}%
                        </b>
                      </span>
                    </div>

                    {/* Churn score bar */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <div className={`h-full rounded-full ${cfg.barColor} transition-all`} style={{ width: `${result.churnScore}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold ${cfg.text}`}>{result.churnScore}%</span>
                    </div>

                    <p className="text-[11px] text-primary mt-1.5 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" /> {result.suggestedAction}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <Button
                      size="sm" variant="ghost" className="h-7 w-7 p-0"
                      onClick={(e) => { e.stopPropagation(); navigate("/v1/chat"); }}
                      title="Enviar mensagem"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-7 w-7 p-0"
                      onClick={(e) => { e.stopPropagation(); navigate("/v1/appointments"); }}
                      title="Agendar consulta"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-7 w-7 p-0"
                      onClick={(e) => { e.stopPropagation(); navigate(`/patients/${result.patient.id}`); }}
                      title="Revisar plano"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Summary footer */}
      {churnResults.length > 0 && (
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30 text-xs text-muted-foreground">
          {highCount > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> {highCount} alto risco</span>}
          {modCount > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> {modCount} moderado</span>}
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> {patients.length - highCount - modCount} estáveis</span>
        </div>
      )}
    </div>
  );
}
