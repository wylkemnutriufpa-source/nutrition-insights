/**
 * 🛡️ BANNER DE AVALIAÇÃO CLÍNICA — FitJourney 2.0
 *
 * Mostra um aviso leve e persistente para pacientes que ainda não
 * completaram a avaliação clínica (anamnese).
 *
 * REGRAS:
 * ✅ Não bloqueia o dashboard
 * ✅ Não redireciona forçado
 * ✅ Não cria loops
 * ✅ Dismiss por sessão (volta na próxima sessão)
 * ✅ Desaparece quando clinical_assessment_completed = true
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardCheck, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const DISMISS_KEY = "fj_clinical_banner_dismissed";

export function ClinicalAssessmentBanner() {
  const { user, profile, isPatient } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isPatient || !user) return;

    // Se já dismissou nesta sessão, não mostra
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    // Verificar se já completou a avaliação clínica
    const checkAssessment = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("clinical_assessment_completed, onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) return;

      // Camada de compatibilidade: verifica ambas as flags
      const isComplete = data.clinical_assessment_completed || data.onboarding_completed;

      if (!isComplete) {
        // Delay para não aparecer imediatamente ao carregar
        setTimeout(() => setVisible(true), 2000);
      }
    };

    checkAssessment();
  }, [user, isPatient]);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    // Dismiss por sessão (volta na próxima sessão)
    sessionStorage.setItem(DISMISS_KEY, "1");
  };

  const handleStartAssessment = () => {
    handleDismiss();
    navigate("/anamnesis");
  };

  if (!visible || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3 }}
        className="relative bg-emerald-950/80 border border-emerald-500/30 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg shadow-emerald-900/20 backdrop-blur-sm"
      >
        {/* Ícone */}
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <ClipboardCheck className="w-4 h-4 text-emerald-400" />
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">
            Complete sua avaliação clínica
          </p>
          <p className="text-xs text-emerald-200/60 mt-0.5 leading-tight">
            Libere sua personalização completa — plano, protocolo e substituições sob medida.
          </p>
        </div>

        {/* CTA */}
        <Button
          size="sm"
          onClick={handleStartAssessment}
          className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl border-0 flex-shrink-0 gap-1"
        >
          Começar <ArrowRight className="w-3 h-3" />
        </Button>

        {/* Fechar */}
        <button
          onClick={handleDismiss}
          className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
          aria-label="Fechar aviso"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
