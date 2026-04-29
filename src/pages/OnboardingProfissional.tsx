import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Rocket, Users, LayoutDashboard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

import slide1 from "@/assets/onboarding/slide-1.png";
import slide2 from "@/assets/onboarding/slide-2.png";
import slide3 from "@/assets/onboarding/slide-3.png";
import slide4 from "@/assets/onboarding/slide-4.png";
import slide5 from "@/assets/onboarding/slide-5.png";
import slide6 from "@/assets/onboarding/slide-6.png";
import slide7 from "@/assets/onboarding/slide-7.png";
import slide8 from "@/assets/onboarding/slide-8.png";
import slide9 from "@/assets/onboarding/slide-9.png";
import slide10 from "@/assets/onboarding/slide-10.png";

interface SlideData {
  image: string;
  caption: string;
  detail: string;
}

const SLIDES: SlideData[] = [
  { image: slide1, caption: "A evolução da Nutrição Clínica Inteligente", detail: "O FitJourney une dados, metabolismo e estratégia em uma plataforma única — para que você tome decisões clínicas com confiança absoluta." },
  { image: slide2, caption: "Dashboard Clínico & Cockpit de Decisões", detail: "Visualize toda sua carteira de pacientes, riscos de abandono, scores de adesão e alertas clínicos em tempo real — tudo num único painel." },
  { image: slide3, caption: "Editor de Planos Alimentares Premium", detail: "Monte planos alimentares em minutos com grade semanal visual, biblioteca de refeições, geração automática e controle de macros em tempo real." },
  { image: slide4, caption: "Inteligência Preditiva & Motor Clínico", detail: "O FitJourney analisa padrões metabólicos e comportamentais para prever estagnação antes que ela aconteça — com recomendações proativas." },
  { image: slide5, caption: "Automação, Gamificação & Crescimento", detail: "Automações inteligentes, sistema de pontos, ranking global, protocolos especiais e ferramentas de crescimento para escalar seu consultório." },
  { image: slide6, caption: "Protocolos Clínicos Estruturados", detail: "Crie e gerencie protocolos nutricionais completos com fases, tarefas diárias e transições automáticas baseadas na evolução do paciente." },
  { image: slide7, caption: "Relatórios & Analytics Avançados", detail: "Relatórios automáticos semanais e mensais com gráficos de evolução, comparativos entre consultas e exportação em PDF profissional." },
  { image: slide8, caption: "Engajamento Inteligente do Paciente", detail: "Comunicação ativa e personalizada, check-ins automáticos, acompanhamento contínuo e motivação baseada em dados reais de adesão." },
  { image: slide9, caption: "Inteligência Artificial Clínica", detail: "IA opcional integrada para análise de refeições, geração de receitas, insights de anamnese e suporte à decisão clínica — sempre sob sua supervisão." },
  { image: slide10, caption: "Escale Seu Consultório com Tecnologia", detail: "Landing pages, sistema de afiliados, agendamento online, pagamentos via Stripe e ferramentas de crescimento para transformar seu consultório." },
];

const ONBOARDING_KEY = "fitjourney_professional_onboarding_completed";
const SWIPE_THRESHOLD = 50;

export default function OnboardingProfissional() {
  const navigate = useNavigate();
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

  const complete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    navigate("/");
  }, [navigate]);

  const skip = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    navigate("/");
  }, [navigate]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(idx + 1); }
      if (e.key === "ArrowLeft") go(idx - 1);
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [idx, go, skip]);

  // Preload
  useEffect(() => { SLIDES.forEach((s) => { const img = new Image(); img.src = s.image; }); }, []);

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > SWIPE_THRESHOLD) { diff > 0 ? go(idx + 1) : go(idx - 1); }
  };

  const slide = SLIDES[idx];

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden select-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-emerald-500/[0.06] blur-[120px]" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      </div>

      <Particles />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-4 md:px-8 py-3">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold text-white/80 tracking-wide">FitJourney</span>
          <span className="text-[11px] text-white/40 hidden sm:inline">Slide {idx + 1} de {total}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={skip} className="text-white/50 hover:text-white/80 hover:bg-white/5">
          <X className="w-4 h-4 mr-1" /> Pular
        </Button>
      </header>

      {/* Progress */}
      <div className="relative z-10 mx-4 md:mx-8">
        <div className="h-[2px] bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300" animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 md:px-8 py-6" style={{ height: "calc(100vh - 110px)" }}>
        <AnimatePresence mode="wait" custom={dir}>
          {isCTA ? (
            <CTASlide key="cta" dir={dir} onComplete={complete} onNavigate={(path) => { localStorage.setItem(ONBOARDING_KEY, "true"); navigate(path); }} />
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
              {/* Slide image — glass container */}
              <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl shadow-emerald-900/20 border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm" style={{ maxHeight: "80vh" }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10 pointer-events-none" />
                <img src={slide.image} alt={slide.caption} className="w-full h-full object-contain block" draggable={false} />
              </div>

              {/* Caption */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="text-center max-w-2xl">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2 tracking-tight">{slide.caption}</h2>
                <p className="text-sm md:text-base text-white/60 leading-relaxed">{slide.detail}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer nav */}
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

function CTASlide({ dir, onComplete, onNavigate }: { dir: number; onComplete: () => void; onNavigate: (path: string) => void }) {
  return (
    <motion.div custom={dir} initial={{ opacity: 0, scale: 0.95, filter: "blur(12px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.95, filter: "blur(12px)" }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-xl mx-auto text-center flex flex-col items-center gap-8">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-2xl shadow-emerald-600/30">
        <Rocket className="w-10 h-10 text-white" />
      </div>
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">Você agora possui um sistema de<br />nutrição clínica inteligente</h2>
        <p className="text-white/50 text-sm">Escolha por onde começar sua jornada:</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <Button onClick={onComplete} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white h-12 text-sm font-semibold shadow-lg shadow-emerald-900/30 border-0">
          <LayoutDashboard className="w-4 h-4 mr-2" /> Ir para Dashboard
        </Button>
        <Button onClick={() => onNavigate("/patients")} variant="outline" className="flex-1 border-emerald-600/40 text-emerald-400 hover:bg-emerald-600/10 h-12 text-sm font-semibold">
          <Users className="w-4 h-4 mr-2" /> Criar Primeiro Paciente
        </Button>
      </div>
      <Button onClick={() => onNavigate("/meal-plan-editor")} variant="ghost" className="text-white/40 hover:text-white/70 text-xs">
        <Sparkles className="w-3 h-3 mr-1" /> Explorar Editor de Planos
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
