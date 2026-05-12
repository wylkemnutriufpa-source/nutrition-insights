import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { useTenant } from "@v1/lib/tenantContext";
import { withTenantFilter } from "@v1/lib/tenantQueryHelpers";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  UserX, Clock, Send, Calendar, FileText, Shield, Brain,
  AlertTriangle, TrendingDown, RefreshCw, Zap, Phone, CheckCheck
} from "lucide-react";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Progress } from "@v1/components/ui/progress";
import { Skeleton } from "@v1/components/ui/skeleton";

interface RecoveryAction {
  id: string;
  patient_id: string;
  dropout_risk_score: number;
  dropout_risk_level: string;
  suggested_strategy: string;
  clinical_reason: string;
  priority: number;
  cluster_origin: string;
  plan_efficacy_score: number;
  days_inactive: number;
  adherence_at_moment: number;
  status: string;
  created_at: string;
  metadata: any;
  // Joined
  patient_name?: string;
}

const levelConfig: Record<string, { label: string; bg: string; text: string; dot: string; barColor: string }> = {
  critico: { label: "Crítico", bg: "bg-destructive/10 border-destructive/20", text: "text-destructive", dot: "bg-destructive", barColor: "bg-destructive" },
  alto: { label: "Alto", bg: "bg-destructive/5 border-destructive/15", text: "text-destructive/80", dot: "bg-destructive/70", barColor: "bg-destructive/70" },
  moderado: { label: "Moderado", bg: "bg-warning/10 border-warning/20", text: "text-warning", dot: "bg-warning", barColor: "bg-warning" },
  baixo: { label: "Baixo", bg: "bg-muted/50 border-border", text: "text-muted-foreground", dot: "bg-muted-foreground", barColor: "bg-muted-foreground" },
};

const strategyConfig: Record<string, { label: string; icon: any; color: string }> = {
  contato_imediato: { label: "Contato Imediato", icon: Phone, color: "text-destructive" },
  simplificar_plano: { label: "Simplificar Plano", icon: FileText, color: "text-warning" },
  reduzir_pressao_resultado: { label: "Reduzir Pressão", icon: Shield, color: "text-warning" },
  estrategia_motivacional: { label: "Estratégia Motivacional", icon: Zap, color: "text-primary" },
  agendar_retorno: { label: "Agendar Retorno", icon: Calendar, color: "text-primary" },
  intervencao_intensiva: { label: "Intervenção Intensiva", icon: AlertTriangle, color: "text-destructive" },
};

const clusterLabels: Record<string, string> = {
  metabolic_responder: "Respondedor",
  metabolic_adaptive: "Adaptativo",
  behavioral_struggler: "Lutador",
  resistant_profile: "Resistente",
  disengaging_patient: "Desengajando",
  unknown: "—",
};

export default function BehavioralDropoutPanel() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [applying, setApplying] = useState<string | null>(null);

  const { data: actions, isLoading } = useQuery({
    queryKey: ["behavioral-recovery-actions", user?.id],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      // Get patient IDs
      const { data: rels } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", user!.id)
        .eq("status", "active");

      if (!rels || rels.length === 0) return [];
      const pids = rels.map((r: any) => r.patient_id);

      // Get recovery actions + profiles
      const [actionsRes, profilesRes] = await Promise.all([
        withTenantFilter((supabase as any)
          .from("behavioral_recovery_actions")
          .select("*")
          .in("patient_id", pids)
          .eq("status", "pending")
          .order("priority", { ascending: true })
          .order("dropout_risk_score", { ascending: false }), tenantId),
        supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", pids),
      ]);

      const profileMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; });

      return (actionsRes.data || []).map((a: any) => ({
        ...a,
        patient_name: profileMap[a.patient_id] || "Paciente",
      })) as RecoveryAction[];
    },
  });

  const handleAction = async (actionId: string, newStatus: "applied" | "ignored") => {
    setApplying(actionId);
    try {
      const { error } = await (supabase as any)
        .from("behavioral_recovery_actions")
        .update({
          status: newStatus,
          applied_at: new Date().toISOString(),
          applied_by: user?.id,
        })
        .eq("id", actionId);
      if (error) throw error;
      toast.success(newStatus === "applied" ? "Ação aplicada" : "Ação ignorada");
      queryClient.invalidateQueries({ queryKey: ["behavioral-recovery-actions"] });
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setApplying(null);
    }
  };

  const list = actions || [];
  const criticalCount = list.filter(a => a.dropout_risk_level === "critico").length;
  const highCount = list.filter(a => a.dropout_risk_level === "alto").length;

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserX className="w-5 h-5 text-destructive animate-pulse" />
          <h2 className="font-display font-semibold">Risco de Abandono</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
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
            <h2 className="font-display font-semibold">Previsão de Abandono</h2>
            <p className="text-xs text-muted-foreground">
              {list.length > 0
                ? `${list.length} paciente${list.length > 1 ? "s" : ""} em risco · Motor v1.0.0`
                : "Todos os pacientes engajados ✅"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-destructive/20 text-destructive animate-pulse">
              {criticalCount} crítico{criticalCount > 1 ? "s" : ""}
            </span>
          )}
          {highCount > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-destructive/10 text-destructive/80">
              {highCount} alto{highCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-6">
          <Shield className="w-8 h-8 text-success mx-auto mb-2 opacity-60" />
          <p className="text-sm text-muted-foreground">Nenhum paciente em risco de abandono. 🎉</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {list.slice(0, 8).map((action, i) => {
            const cfg = levelConfig[action.dropout_risk_level] || levelConfig.baixo;
            const strat = strategyConfig[action.suggested_strategy] || strategyConfig.estrategia_motivacional;
            const StratIcon = strat.icon;

            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-lg border p-3.5 transition-all ${cfg.bg}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <p
                        className="text-sm font-semibold cursor-pointer hover:underline"
                        onClick={() => navigate(`/patients/${action.patient_id}`)}
                      >
                        {action.patient_name}
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cfg.text} bg-card`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1`} />
                        {cfg.label} · {action.dropout_risk_score}%
                      </span>
                    </div>

                    {/* Metrics row */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {action.days_inactive === 0 ? "Hoje" : `${action.days_inactive}d inativo`}
                      </span>
                      <span>
                        Adesão: <b className={action.adherence_at_moment < 50 ? "text-destructive" : "text-foreground"}>
                          {action.adherence_at_moment}%
                        </b>
                      </span>
                      <span>
                        Cluster: <b>{clusterLabels[action.cluster_origin || "unknown"]}</b>
                      </span>
                      <span>
                        Eficácia: <b>{action.plan_efficacy_score}/100</b>
                      </span>
                    </div>

                    {/* Score bar */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${cfg.barColor} transition-all`}
                          style={{ width: `${action.dropout_risk_score}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-bold ${cfg.text}`}>{action.dropout_risk_score}%</span>
                    </div>

                    {/* Strategy suggestion */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <StratIcon className={`w-3.5 h-3.5 ${strat.color}`} />
                      <span className={`text-[11px] font-medium ${strat.color}`}>{strat.label}</span>
                      <span className="text-[10px] text-muted-foreground">— {action.clinical_reason}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-2.5 flex-wrap">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-[11px] gap-1"
                        disabled={applying === action.id}
                        onClick={() => handleAction(action.id, "applied")}
                      >
                        <CheckCheck className="w-3 h-3" />
                        {applying === action.id ? "..." : "Aplicar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] gap-1"
                        onClick={() => handleAction(action.id, "ignored")}
                      >
                        Ignorar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] gap-1"
                        onClick={() => navigate("/chat")}
                      >
                        <Send className="w-3 h-3" /> Mensagem
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] gap-1"
                        onClick={() => navigate("/appointments")}
                      >
                        <Calendar className="w-3 h-3" /> Retorno
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] gap-1"
                        onClick={() => navigate(`/patients/${action.patient_id}`)}
                      >
                        <FileText className="w-3 h-3" /> Ver Plano
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Summary footer */}
      {list.length > 0 && (
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30 text-xs text-muted-foreground">
          {criticalCount > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> {criticalCount} crítico</span>}
          {highCount > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive/70" /> {highCount} alto</span>}
          {list.length - criticalCount - highCount > 0 && (
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> {list.length - criticalCount - highCount} moderado</span>
          )}
        </div>
      )}
    </div>
  );
}
