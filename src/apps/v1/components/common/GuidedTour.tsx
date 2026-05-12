import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@v1/components/ui/button";
import { ChevronRight, X, Sparkles } from "lucide-react";

export interface TourStep {
  /** CSS selector for the element to spotlight */
  selector: string;
  /** Tooltip title */
  title: string;
  /** Tooltip description */
  description: string;
}

interface GuidedTourProps {
  steps: TourStep[];
  storageKey: string;
  onComplete: () => void;
}

export default function GuidedTour({ steps, storageKey, onComplete }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<"bottom" | "top">("bottom");
  const observerRef = useRef<ResizeObserver | null>(null);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const updateRect = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect(r);
      // Position tooltip above or below based on available space
      setTooltipPos(r.bottom + 250 > window.innerHeight ? "top" : "bottom");
    } else {
      setRect(null);
    }
  }, [step]);

  useEffect(() => {
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    // Observe element size changes
    if (step) {
      const el = document.querySelector(step.selector);
      if (el) {
        observerRef.current = new ResizeObserver(updateRect);
        observerRef.current.observe(el);
      }
    }

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      observerRef.current?.disconnect();
    };
  }, [updateRect, step]);

  const next = () => {
    if (isLast) {
      localStorage.setItem(storageKey, "true");
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const skip = () => {
    localStorage.setItem(storageKey, "true");
    onComplete();
  };

  // ESC to skip
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentStep]);

  const pad = 8;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-auto">
      {/* Dark overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - pad}
                y={rect.top - pad}
                width={rect.width + pad * 2}
                height={rect.height + pad * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.75)"
          mask="url(#tour-spotlight-mask)"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => e.stopPropagation()}
        />
      </svg>

      {/* Glow ring around spotlight */}
      {rect && (
        <div
          className="absolute rounded-xl pointer-events-none"
          style={{
            left: rect.left - pad - 2,
            top: rect.top - pad - 2,
            width: rect.width + pad * 2 + 4,
            height: rect.height + pad * 2 + 4,
            boxShadow: "0 0 0 2px rgba(16,185,129,0.5), 0 0 30px 4px rgba(16,185,129,0.2)",
            transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        {rect && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: tooltipPos === "bottom" ? -10 : 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="absolute z-[201] w-[340px] max-w-[90vw]"
            style={{
              left: Math.min(Math.max(rect.left, 16), window.innerWidth - 356),
              ...(tooltipPos === "bottom"
                ? { top: rect.bottom + pad + 16 }
                : { bottom: window.innerHeight - rect.top + pad + 16 }),
              pointerEvents: "auto",
            }}
          >
            <div className="bg-gray-900/95 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-5 shadow-2xl shadow-emerald-900/30">
              {/* Step indicator */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-1">
                  {steps.map((_, i) => (
                    <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentStep ? "w-5 bg-emerald-400" : i < currentStep ? "w-2 bg-emerald-400/40" : "w-2 bg-white/15"}`} />
                  ))}
                </div>
                <button onClick={skip} className="text-white/30 hover:text-white/60 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-white font-bold text-base mb-1.5">{step.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-4">{step.description}</p>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/30">{currentStep + 1} de {steps.length}</span>
                <Button
                  size="sm"
                  onClick={next}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-lg shadow-emerald-900/30 h-9 px-4 text-sm"
                >
                  {isLast ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Entendi, começar usar
                    </>
                  ) : (
                    <>
                      Próximo <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fallback if no element found */}
      {!rect && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: "auto" }}>
          <div className="bg-gray-900/95 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6 shadow-2xl max-w-sm text-center">
            <h3 className="text-white font-bold mb-2">{step.title}</h3>
            <p className="text-white/60 text-sm mb-4">{step.description}</p>
            <Button size="sm" onClick={next} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0">
              {isLast ? "Entendi, começar usar" : "Próximo"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tour step definitions ─────────────────────────────────── */

export const PROFESSIONAL_TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="dashboard"]',
    title: "Dashboard Clínico",
    description: "Aqui você acompanha pacientes em risco, oportunidades de intervenção e a visão geral da sua clínica.",
  },
  {
    selector: '[data-tour="patients"]',
    title: "Lista de Pacientes",
    description: "Gerencie toda sua base com visão clínica estruturada — adesão, alertas e evolução de cada paciente.",
  },
  {
    selector: '[data-tour="meal-editor"]',
    title: "Editor de Planos Premium",
    description: "Monte protocolos alimentares com rapidez e precisão usando grade visual, biblioteca de refeições e IA.",
  },
  {
    selector: '[data-tour="alerts"]',
    title: "Alertas Clínicos",
    description: "O sistema identifica padrões de risco automaticamente e te notifica antes que problemas aconteçam.",
  },
  {
    selector: '[data-tour="automation"]',
    title: "Centro de Automações",
    description: "Crie fluxos inteligentes para escalar seu atendimento sem perder a qualidade do acompanhamento.",
  },
  {
    selector: '[data-tour="financial"]',
    title: "Financeiro",
    description: "Acompanhe crescimento e previsibilidade de receita — veja o impacto de cada decisão clínica no resultado.",
  },
];

export const PATIENT_TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="checklist"]',
    title: "Checklist Diário",
    description: "Suas tarefas diárias de nutrição, hidratação e hábitos saudáveis organizadas num só lugar.",
  },
  {
    selector: '[data-tour="meal-plan"]',
    title: "Plano Alimentar",
    description: "Veja suas refeições do dia, ingredientes, modo de preparo e informações nutricionais.",
  },
  {
    selector: '[data-tour="checkin"]',
    title: "Check-in de Peso",
    description: "Registre seu peso regularmente e acompanhe sua evolução com gráficos claros.",
  },
  {
    selector: '[data-tour="chat"]',
    title: "Chat com Nutricionista",
    description: "Fale com seu nutricionista em tempo real sempre que precisar de ajuda ou orientação.",
  },
  {
    selector: '[data-tour="gamification"]',
    title: "Gamificação",
    description: "Complete missões, ganhe XP, mantenha seu streak e suba no ranking. Sua evolução virou jogo!",
  },
];
