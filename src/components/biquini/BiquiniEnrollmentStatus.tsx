import { motion } from "framer-motion";
import { Card, CardContent } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Progress } from "@v1/components/ui/progress";
import { Button } from "@v1/components/ui/button";
import {
  Lock, CheckCircle2, AlertTriangle, Clock, Scale,
  Camera, Target, Flame, Calendar, ArrowRight, Sparkles, Trophy
} from "lucide-react";

interface Enrollment {
  id: string;
  status: string;
  current_phase: number;
  blocked_reason: string | null;
  next_weight_due_at: string | null;
  next_full_review_due_at: string | null;
  initial_weight: number | null;
  initial_kcal_target: number | null;
  onboarding_completed_at: string | null;
  started_at: string;
}

interface Props {
  enrollment: Enrollment;
  onSendWeight?: () => void;
  onSendPhotos?: () => void;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_onboarding: { label: "Onboarding Pendente", color: "bg-amber-500/10 text-amber-500", icon: <Clock className="w-4 h-4" /> },
  awaiting_required_data: { label: "Dados Pendentes", color: "bg-orange-500/10 text-orange-500", icon: <AlertTriangle className="w-4 h-4" /> },
  protocol_1_active: { label: "Protocolo 1 Ativo", color: "bg-emerald-500/10 text-emerald-500", icon: <CheckCircle2 className="w-4 h-4" /> },
  awaiting_weight_update: { label: "Peso Pendente", color: "bg-amber-500/10 text-amber-500", icon: <Scale className="w-4 h-4" /> },
  awaiting_full_reassessment: { label: "Reavaliação Pendente", color: "bg-orange-500/10 text-orange-500", icon: <Camera className="w-4 h-4" /> },
  protocol_locked: { label: "Protocolo Bloqueado", color: "bg-destructive/10 text-destructive", icon: <Lock className="w-4 h-4" /> },
  protocol_2_ready: { label: "Protocolo 2 Pronto", color: "bg-primary/10 text-primary", icon: <ArrowRight className="w-4 h-4" /> },
  protocol_2_active: { label: "Protocolo 2 Ativo", color: "bg-emerald-500/10 text-emerald-500", icon: <Flame className="w-4 h-4" /> },
  protocol_3_ready: { label: "Protocolo 3 Pronto", color: "bg-purple-500/10 text-purple-500", icon: <ArrowRight className="w-4 h-4" /> },
  protocol_3_active: { label: "Protocolo 3 Ativo", color: "bg-purple-500/10 text-purple-500", icon: <Sparkles className="w-4 h-4" /> },
  protocol_4_ready: { label: "Fase 4 — Aguardando Renovação", color: "bg-amber-500/10 text-amber-500", icon: <Clock className="w-4 h-4" /> },
  protocol_4_active: { label: "Protocolo 4 Ativo", color: "bg-emerald-500/10 text-emerald-500", icon: <Trophy className="w-4 h-4" /> },
  completed: { label: "Programa Concluído", color: "bg-primary/10 text-primary", icon: <CheckCircle2 className="w-4 h-4" /> },
};

const PHASE_NAMES = ["", "Reset Metabólico", "Déficit Estratégico", "Definição Corporal", "Manutenção Inteligente"];

export default function BiquiniEnrollmentStatus({ enrollment, onSendWeight, onSendPhotos }: Props) {
  const statusInfo = STATUS_MAP[enrollment.status] || STATUS_MAP.pending_onboarding;
  const phaseProgress = (enrollment.current_phase / 4) * 100;
  
  const daysUntilWeight = enrollment.next_weight_due_at
    ? Math.max(0, Math.ceil((new Date(enrollment.next_weight_due_at).getTime() - Date.now()) / 86400000))
    : null;
  const daysUntilReview = enrollment.next_full_review_due_at
    ? Math.max(0, Math.ceil((new Date(enrollment.next_full_review_due_at).getTime() - Date.now()) / 86400000))
    : null;

  const isBlocked = enrollment.status === "protocol_locked";
  const isAwaitingRenewal = enrollment.status === "protocol_4_ready";
  const needsWeight = enrollment.status === "awaiting_weight_update" || (daysUntilWeight !== null && daysUntilWeight <= 0);
  const needsReview = enrollment.status === "awaiting_full_reassessment" || (daysUntilReview !== null && daysUntilReview <= 0);

  return (
    <Card className={`glass shadow-card overflow-hidden ${isBlocked ? "border-destructive/30" : isAwaitingRenewal ? "border-amber-500/30" : ""}`}>
      {isBlocked && (
        <div className="bg-destructive/10 p-3 flex items-center gap-2 text-destructive text-sm">
          <Lock className="w-4 h-4" />
          <span className="font-medium">Protocolo bloqueado: {enrollment.blocked_reason || "Envie peso e fotos para continuar."}</span>
        </div>
      )}

      {isAwaitingRenewal && (
        <div className="bg-amber-500/10 p-3 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
          <Clock className="w-4 h-4" />
          <span className="font-medium">Fase 4 disponível após renovação do plano ou pacote semestral.</span>
        </div>
      )}
      
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👙</span>
            <div>
              <h3 className="font-display font-bold">Projeto Biquíni Branco</h3>
              <p className="text-xs text-muted-foreground">Fase {enrollment.current_phase}: {PHASE_NAMES[enrollment.current_phase]}</p>
            </div>
          </div>
          <Badge className={`${statusInfo.color} border-0 gap-1`}>
            {statusInfo.icon} {statusInfo.label}
          </Badge>
        </div>

        {/* Phase progress */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progresso do programa</span>
            <span>{Math.round(phaseProgress)}%</span>
          </div>
          <Progress value={phaseProgress} className="h-2" />
        </div>

        {/* Deadlines */}
        <div className="grid grid-cols-2 gap-3">
          {daysUntilWeight !== null && (
            <div className={`p-3 rounded-xl text-center ${needsWeight ? "bg-destructive/10 border border-destructive/20" : "bg-muted/50"}`}>
              <Scale className={`w-5 h-5 mx-auto mb-1 ${needsWeight ? "text-destructive" : "text-muted-foreground"}`} />
              <p className="text-xs text-muted-foreground">Próximo peso</p>
              <p className={`text-sm font-bold ${needsWeight ? "text-destructive" : ""}`}>
                {daysUntilWeight <= 0 ? "ATRASADO" : `${daysUntilWeight} dias`}
              </p>
            </div>
          )}
          {daysUntilReview !== null && (
            <div className={`p-3 rounded-xl text-center ${needsReview ? "bg-destructive/10 border border-destructive/20" : "bg-muted/50"}`}>
              <Camera className={`w-5 h-5 mx-auto mb-1 ${needsReview ? "text-destructive" : "text-muted-foreground"}`} />
              <p className="text-xs text-muted-foreground">Reavaliação</p>
              <p className={`text-sm font-bold ${needsReview ? "text-destructive" : ""}`}>
                {daysUntilReview <= 0 ? "ATRASADO" : `${daysUntilReview} dias`}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons when blocked/overdue */}
        {(needsWeight || needsReview) && (
          <div className="flex gap-2">
            {needsWeight && onSendWeight && (
              <Button size="sm" onClick={onSendWeight} className="gap-1 flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white">
                <Scale className="w-4 h-4" /> Enviar Peso
              </Button>
            )}
            {needsReview && onSendPhotos && (
              <Button size="sm" onClick={onSendPhotos} className="gap-1 flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white">
                <Camera className="w-4 h-4" /> Enviar Fotos
              </Button>
            )}
          </div>
        )}

        {/* Metrics */}
        {enrollment.initial_weight && (
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Peso Inicial</p>
              <p className="font-bold text-sm">{enrollment.initial_weight}kg</p>
            </div>
            {enrollment.initial_kcal_target && (
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Meta Calórica</p>
                <p className="font-bold text-sm">{enrollment.initial_kcal_target}kcal</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
