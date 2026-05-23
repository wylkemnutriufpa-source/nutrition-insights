import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Heart, Sparkles, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

import slide1 from "@/assets/onboarding-paciente/slide-1.png";
import slide2 from "@/assets/onboarding-paciente/slide-2.png";
// slides 3-10 removidos (fase 1 soberana: onboarding = 2 slides de intro)

interface SlideData {
  image: string;
  caption: string;
  detail: string;
}

// 🛡️ FASE 1 SOBERANA: Onboarding reduzido a 2 slides de introdução
// O centro clínico é a Anamnese — não o slideshow.
const SLIDES: SlideData[] = [
  { 
    image: slide1, 
    caption: "Bem-vindo ao FitJourney", 
    detail: "Aqui seu plano alimentar é personalizado com base em dados clínicos reais. Não é dieta genérica — é protocolo clínico soberano." 
  },
  { 
    image: slide2, 
    caption: "Sua avaliação clínica é o ponto de partida", 
    detail: "Para criar um plano 100% personalizado para você, precisamos conhecer sua saúde, objetivos e histórico clínico. São poucos minutos com impacto duradouro." 
  },
];

const ONBOARDING_KEY = "patient_onboarding_completed";
const FORCE_RESET_KEY = "fitjourney_force_reset_v1";
const SWIPE_THRESHOLD = 50;

import { usePatientJourneyStatus } from "@/hooks/usePatientJourneyStatus";
import { BrainLoaderCard } from "@/components/common/BrainLoader";

export default function OnboardingPaciente() {
  const { status: journeyStatus, loading: journeyLoading } = usePatientJourneyStatus();
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Se o estado já mudou para anamnesis, não mostramos os slides
  useEffect(() => {
    if (profile?.patient_state === 'anamnesis') {
      console.log("[FJ:Onboarding] Estado anamnesis detectado, redirecionando...");
      navigate("/anamnesis", { replace: true });
    }
  }, [profile?.patient_state, navigate]);

  // Hardening: Não decidimos rota aqui. Apenas limpamos a flag de teste.
  // SystemStateGuard observa journeyStatus e redireciona automaticamente
  // se o paciente já passou desta etapa.
  useEffect(() => {
    if (localStorage.getItem(FORCE_RESET_KEY)) {
      console.log("[FJ:Test] Reset forçado detectado via localStorage flag");
      localStorage.removeItem(FORCE_RESET_KEY);
    }
  }, []);

  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const total = SLIDES.length + 1;
  const isLast = idx === total - 1;
  const isCTA = idx === SLIDES.length;
  const progress = ((idx + 1) / total) * 100;
  const touchStart = useRef(0);

  const go = useCallback((next: number) => {
    if (next < 0 || next >= total) return;
    setDir(next > idx ? 1 : -1);
    setIdx(next);
  }, [idx, total]);

  const { user } = useAuth();

  const complete = useCallback(async () => {
    console.log("[FJ:Onboarding] Slides concluídos → indo direto para anamnese clínica.");
    
    if (user?.id) {
      try {
        // 🛡️ FASE 2: Fluxo soberano INTRO → ANAMNESE → DASHBOARD
        // Não passa mais pelo pipeline de 6 steps — vai direto para anamnese
        const { error } = await supabase
          .from("profiles")
          .update({ 
            patient_state: 'anamnesis',
            onboarding_completed: false // Anamnese ainda pendente
          })
          .eq("user_id", user.id);
        
        if (error) throw error;
      } catch (err) {
        console.error("[FJ:Onboarding] Error updating state:", err);
      }
    }

    localStorage.setItem(ONBOARDING_KEY, "true");
    localStorage.removeItem("fj_invited");
    localStorage.removeItem("fj_user_type");

    // 🛡️ Vai direto para anamnese — sem passar pelo /onboarding (pipeline)
    navigate("/anamnesis", { replace: true });
  }, [user?.id, navigate]);

  const skip = useCallback(async () => {
    console.log("[FJ:Onboarding] Skipping onboarding → forcing active_plan and onboarding_completed = true");
    
    if (user?.id) {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ 
            patient_state: 'active_plan' as any,
            onboarding_completed: true
          })
          .eq("user_id", user.id);
        
        if (error) throw error;
      } catch (err) {
        console.error("[FJ:Onboarding] Error skipping onboarding:", err);
      }
    }

    localStorage.setItem(ONBOARDING_KEY, "true");
    navigate("/client/dashboard", { replace: true });
  }, [user?.id, navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(idx + 1); }
      if (e.key === "ArrowLeft") go(idx - 1);
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [idx, go, skip]);

  useEffect(() => { SLIDES.forEach((s) => { const img = new Image(); img.src = s.image; }); }, []);

  const onTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > SWIPE_THRESHOLD) { diff > 0 ? go(idx + 1) : go(idx - 1); }
  };

  const slide = SLIDES[idx];

  if (journeyLoading) return <div className="min-h-screen bg-black flex items-center justify-center"><BrainLoaderCard text="Preparando sua jornada..." /></div>;

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden select-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-emerald-500/[0.06] blur-[120px]" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      </div>

      <Particles />

      <header className="relative z-10 flex items-center justify-between px-4 md:px-8 py-3">
        <div className="flex items-center gap-3">
          <Heart className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold text-white/80 tracking-wide">FitJourney</span>
          <span className="text-[11px] text-white/40 hidden sm:inline">Slide {idx + 1} de {total}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={skip} className="text-white/50 hover:text-white/80 hover:bg-white/5">
          <X className="w-4 h-4 mr-1" /> Pular
        </Button>
      </header>

      <div className="relative z-10 mx-4 md:mx-8">
        <div className="h-[2px] bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300" animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
        </div>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 md:px-8 py-6" style={{ height: "calc(100vh - 110px)" }}>
        <AnimatePresence mode="wait" custom={dir}>
          {isCTA ? (
            <CTASlide key="cta" dir={dir} onComplete={complete} />
          ) : (
            <motion.div
              key={idx}
              custom={dir}
              initial={{ opacity: 0, x: dir * 60, scale: 0.98, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: dir * -60, scale: 0.98, filter: "blur(8px)" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[1200px] mx-auto flex flex-col items-center gap-5"
            >
              <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl shadow-emerald-900/20 border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm" style={{ maxHeight: "80vh" }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10 pointer-events-none" />
                <img src={slide.image} alt={slide.caption} className="w-full h-full object-contain block" draggable={false} />
              </div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="text-center max-w-2xl">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2 tracking-tight">{slide.caption}</h2>
                <p className="text-sm md:text-base text-white/60 leading-relaxed">{slide.detail}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="relative z-10 px-4 md:px-8 py-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" disabled={idx === 0} onClick={() => go(idx - 1)} className="text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-20">
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div className="hidden sm:flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <button key={i} onClick={() => go(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-6 bg-emerald-400" : i < idx ? "w-1.5 bg-emerald-400/40" : "w-1.5 bg-white/20"}`} />
          ))}
        </div>
        {!isLast ? (
          <Button size="sm" onClick={() => go(idx + 1)} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-lg shadow-emerald-900/30">
            Próximo <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : <div />}
      </footer>
    </div>
  );
}

function CTASlide({ dir, onComplete }: { dir: number; onComplete: () => void }) {
  return (
    <motion.div custom={dir} initial={{ opacity: 0, scale: 0.95, filter: "blur(12px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.95, filter: "blur(12px)" }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-xl mx-auto text-center flex flex-col items-center gap-8">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-2xl shadow-emerald-600/30">
        <Rocket className="w-10 h-10 text-white" />
      </div>
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">Pronto para começar<br />sua avaliação clínica?</h2>
        <p className="text-white/50 text-sm">Em poucos minutos, seu nutricionista terá tudo que precisa para criar seu protocolo personalizado.</p>
      </div>
      <Button onClick={onComplete} className="bg-emerald-600 hover:bg-emerald-500 text-white h-14 px-8 text-base font-semibold shadow-lg shadow-emerald-900/30 border-0 rounded-xl">
        <Sparkles className="w-5 h-5 mr-2" /> Começar avaliação clínica
      </Button>
    </motion.div>
  );
}

function Particles() {
  const particles = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ id: i, x: Math.random() * 100, y: Math.random() * 100, size: 1 + Math.random() * 2, duration: 15 + Math.random() * 20, delay: Math.random() * 10 })), []);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div key={p.id} className="absolute rounded-full bg-emerald-400/20" style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }} animate={{ y: [0, -40, 0], opacity: [0, 0.6, 0] }} transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }} />
      ))}
    </div>
  );
}
