/**
 * 🛡️ COCKPIT DE GERAÇÃO DE PLANOS — FitJourney 2.0
 *
 * Modal que dá ao nutricionista 3 opções claras para criar planos:
 * 1. Automático Soberano (motor clínico)
 * 2. Manual com Template (biblioteca)
 * 3. Manual do Zero (editor vazio com targets)
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Library,
  PenTool,
  Loader2,
  AlertCircle,
  Zap,
  ChevronRight,
} from "lucide-react";

interface PlanGenerationCockpitProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  hasAnamnesis: boolean;
  patientName?: string;
  /** Pipeline ID if exists */
  pipelineId?: string | null;
}

export function PlanGenerationCockpit({
  open,
  onClose,
  patientId,
  hasAnamnesis,
  patientName,
  pipelineId,
}: PlanGenerationCockpitProps) {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAutomatic = async () => {
    if (!hasAnamnesis) {
      toast.error("Paciente precisa completar a anamnese primeiro.");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      // Se não tem pipeline, criar um temporário para a RPC
      let effectivePipelineId = pipelineId;

      if (!effectivePipelineId) {
        // Buscar ou criar pipeline
        const { data: existingPipeline } = await supabase
          .from("onboarding_pipelines" as any)
          .select("id")
          .eq("patient_id", patientId)
          .not("status", "in", '("completed","superseded_by_active_plan")')
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingPipeline) {
          effectivePipelineId = (existingPipeline as any).id;
        } else {
          // Criar pipeline mínimo para a RPC funcionar
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("user_id", patientId)
            .maybeSingle();

          const { data: link } = await supabase
            .from("nutritionist_patients")
            .select("nutritionist_id")
            .eq("patient_id", patientId)
            .eq("status", "active")
            .maybeSingle();

          if (!link) {
            setError("Paciente não está vinculado a nenhum profissional.");
            setGenerating(false);
            return;
          }

          const { data: newPipeline, error: pipeErr } = await supabase
            .from("onboarding_pipelines" as any)
            .insert({
              patient_id: patientId,
              nutritionist_id: link.nutritionist_id,
              status: "pending_plan_generation",
              anamnesis_completed: true,
              body_data_completed: true,
              preferences_completed: true,
            } as any)
            .select("id")
            .single();

          if (pipeErr || !newPipeline) {
            setError("Erro ao preparar pipeline.");
            setGenerating(false);
            return;
          }
          effectivePipelineId = (newPipeline as any).id;
        }
      }

      // Chamar o motor determinístico
      const { data, error: rpcError } = await supabase.rpc(
        "classify_and_assign_sovereign_template" as any,
        {
          p_patient_id: patientId,
          p_pipeline_id: effectivePipelineId,
        }
      );

      if (rpcError) throw rpcError;
      const result = data as any;

      if (!result?.success) {
        throw new Error(result?.error || "Falha na classificação.");
      }

      toast.success(
        `Plano gerado: ${result.template_title} (${result.kcal_calculated} kcal)`
      );
      onClose();
      navigate(`/editor-v3/${patientId}/${result.plan_id}`);
    } catch (err: any) {
      console.error("[Cockpit] Erro na geração automática:", err);
      setError(err.message || "Erro ao gerar plano automaticamente.");
    } finally {
      setGenerating(false);
    }
  };

  const handleManualTemplate = () => {
    onClose();
    // Navega para o Editor V3 com a biblioteca aberta
    navigate(`/editor-v3/${patientId}?openLibrary=true`);
  };

  const handleManualScratch = () => {
    onClose();
    navigate(`/editor-v3/${patientId}?mode=scratch`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-neutral-950 border-white/10 text-white p-0 rounded-[2rem] overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
            Gerar Plano Alimentar
          </DialogTitle>
          {patientName && (
            <p className="text-sm text-white/40 mt-1">
              Para: <span className="text-emerald-400 font-bold">{patientName}</span>
            </p>
          )}
        </DialogHeader>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Opção 1: Automático Soberano */}
          <button
            onClick={handleAutomatic}
            disabled={generating || !hasAnamnesis}
            className={`w-full text-left p-5 rounded-2xl border transition-all group ${
              hasAnamnesis
                ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50"
                : "border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                {generating ? (
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                ) : (
                  <Zap className="w-6 h-6 text-emerald-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base uppercase tracking-tight">
                    Automático Soberano
                  </h3>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                    Recomendado
                  </span>
                </div>
                <p className="text-xs text-white/40 mt-1 leading-relaxed">
                  {hasAnamnesis
                    ? "Motor clínico seleciona o melhor template baseado na anamnese, calcula targets via Mifflin-St Jeor e gera o plano automaticamente."
                    : "Requer anamnese completa. O paciente precisa preencher a avaliação clínica primeiro."}
                </p>
                {hasAnamnesis && (
                  <p className="text-[10px] text-amber-400/60 mt-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 inline-block" />
                    Plano nasce em Draft — edite e publique para o paciente ver
                  </p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-emerald-400 transition-colors flex-shrink-0 mt-1" />
            </div>
          </button>

          {/* Opção 2: Manual com Template */}
          <button
            onClick={handleManualTemplate}
            className="w-full text-left p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Library className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-base uppercase tracking-tight">
                  Manual com Template
                </h3>
                <p className="text-xs text-white/40 mt-1 leading-relaxed">
                  Escolha um protocolo da biblioteca soberana (65 templates). O template será adaptado aos targets clínicos do paciente.
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1" />
            </div>
          </button>

          {/* Opção 3: Manual do Zero */}
          <button
            onClick={handleManualScratch}
            className="w-full text-left p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <PenTool className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-base uppercase tracking-tight">
                  Manual do Zero
                </h3>
                <p className="text-xs text-white/40 mt-1 leading-relaxed">
                  {hasAnamnesis
                    ? "Editor vazio com targets clínicos pré-calculados. Monte o plano alimento por alimento."
                    : "Editor vazio sem targets. Monte o plano manualmente."}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-amber-400 transition-colors flex-shrink-0 mt-1" />
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
