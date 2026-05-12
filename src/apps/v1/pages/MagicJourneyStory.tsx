import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import { toast } from "sonner";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Button } from "@v1/components/ui/button";
import { Sparkles, ChevronLeft, ChevronRight, Share2, Utensils, ArrowRight, Loader2, Volume2, VolumeX } from "lucide-react";
import { useAmbientAudio } from "@v1/hooks/useAmbientAudio";
import { useFeatureFlag } from "@v1/lib/featureFlags";

interface StoryData {
  narrative_opening: string;
  narrative_diagnosis: string;
  narrative_closing: string;
  phase_label: string;
  phase_description: string;
  insight_title: string;
  insight_description: string;
  projections: { period: string; description: string }[];
  motivational_quote: string;
  share_caption: string;
  metrics: {
    name: string;
    currentWeight: number | null;
    firstWeight: number | null;
    weightChange: string;
    avgAdherence: number;
    streak: number;
    totalXp: number;
    mealCount: number;
    phase: string;
    achievementsCount: number;
    topAchievements: string[];
  };
}

const SLIDE_COUNT = 6;

export default function MagicJourneyStory() {
  const { user } = useAuth();
  const [story, setStory] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedProjection, setSelectedProjection] = useState(0);
  const { isMuted, toggleMute } = useAmbientAudio({ src: "/audio/ambient-floating.mp3" });
  const { enabled: llmEnabled } = useFeatureFlag("llm_global_enabled");

  const generateStory = useCallback(async () => {
    if (!user) return;
    if (!llmEnabled) { toast.error("IA LLM desativada pelo administrador"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-patient-story", {
        body: { patient_id: user.id },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limit")) toast.error("Limite de requisições. Tente novamente em instantes.");
        else if (data.error.includes("Créditos")) toast.error("Créditos de IA insuficientes.");
        else throw new Error(data.error);
        return;
      }
      setStory(data.data);
      setCurrentSlide(0);
    } catch (e: any) {
      toast.error("Erro ao gerar sua história: " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  }, [user]);

  const next = () => setCurrentSlide((p) => Math.min(p + 1, SLIDE_COUNT - 1));
  const prev = () => setCurrentSlide((p) => Math.max(p - 1, 0));

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const slideVariants = {
    enter: { opacity: 0, scale: 0.95, y: 20 },
    center: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 1.02, y: -10 },
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };
  const staggerItem = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-background via-background to-emerald-950/20">
        {/* Ambient particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-emerald-400/30"
              initial={{ x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%`, opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0], y: [`${Math.random() * 100}%`, `${Math.random() * 100 - 20}%`] }}
              transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3 }}
            />
          ))}
        </div>

        {/* Audio toggle */}
        <button onClick={toggleMute} className="absolute top-4 right-4 z-50 p-2 rounded-full bg-background/50 backdrop-blur text-muted-foreground hover:text-foreground transition-colors">
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {!story && !loading && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 z-10">
            <div className="relative inline-block">
              <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-6xl">✨</motion.div>
              <motion.div className="absolute -inset-8 bg-emerald-500/10 rounded-full blur-2xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 3, repeat: Infinity }} />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Minha História Mágica
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Descubra sua jornada de transformação contada em uma experiência cinematográfica única.
            </p>
            <Button onClick={generateStory} size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white gap-2 shadow-lg shadow-emerald-500/25">
              <Sparkles className="w-5 h-5" /> Gerar Minha História
            </Button>
          </motion.div>
        )}

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4 z-10">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-400 mx-auto" />
            <p className="text-muted-foreground">Analisando sua jornada e criando sua história...</p>
          </motion.div>
        )}

        {story && (
          <div className="w-full max-w-4xl mx-auto px-4 z-10">
            {/* Progress bar */}
            <div className="flex gap-1.5 mb-6 px-8">
              {[...Array(SLIDE_COUNT)].map((_, i) => (
                <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-muted/30">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-400"
                    initial={{ width: 0 }}
                    animate={{ width: i <= currentSlide ? "100%" : "0%" }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              ))}
            </div>

            <div className="relative min-h-[420px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  {/* Slide 0: Opening */}
                  {currentSlide === 0 && (
                    <motion.div variants={staggerChildren} initial="hidden" animate="show" className="h-full flex flex-col items-center justify-center text-center space-y-6 p-8">
                      <motion.div variants={staggerItem} className="text-5xl">🌟</motion.div>
                      <motion.h2 variants={staggerItem} className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent leading-relaxed">
                        {story.narrative_opening}
                      </motion.h2>
                      <motion.p variants={staggerItem} className="text-emerald-400/80 text-lg font-medium">
                        {story.phase_label}
                      </motion.p>
                      <motion.p variants={staggerItem} className="text-muted-foreground italic">
                        {story.phase_description}
                      </motion.p>
                    </motion.div>
                  )}

                  {/* Slide 1: Real Evolution */}
                  {currentSlide === 1 && (
                    <motion.div variants={staggerChildren} initial="hidden" animate="show" className="h-full p-8 space-y-6">
                      <motion.h3 variants={staggerItem} className="text-xl font-bold text-emerald-400 text-center">📊 Sua Evolução Real</motion.h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: "Peso Inicial", value: story.metrics.firstWeight ? `${story.metrics.firstWeight}kg` : "N/A", icon: "⚖️" },
                          { label: "Peso Atual", value: story.metrics.currentWeight ? `${story.metrics.currentWeight}kg` : "N/A", icon: "📉" },
                          { label: "Adesão Média", value: `${story.metrics.avgAdherence}%`, icon: "🎯" },
                          { label: "Streak", value: `${story.metrics.streak} dias`, icon: "🔥" },
                          { label: "XP Total", value: story.metrics.totalXp.toLocaleString(), icon: "⭐" },
                          { label: "Refeições", value: story.metrics.mealCount.toString(), icon: "🍽️" },
                          { label: "Conquistas", value: story.metrics.achievementsCount.toString(), icon: "🏆" },
                          { label: "Variação", value: `${story.metrics.weightChange}kg`, icon: parseFloat(story.metrics.weightChange) < 0 ? "✅" : "📌" },
                        ].map((m, i) => (
                          <motion.div key={i} variants={staggerItem} className="bg-card/50 backdrop-blur border border-emerald-500/20 rounded-xl p-4 text-center">
                            <div className="text-2xl mb-1">{m.icon}</div>
                            <div className="text-lg font-bold text-foreground">{m.value}</div>
                            <div className="text-xs text-muted-foreground">{m.label}</div>
                          </motion.div>
                        ))}
                      </div>
                      {story.metrics.topAchievements.length > 0 && (
                        <motion.div variants={staggerItem} className="flex flex-wrap gap-2 justify-center">
                          {story.metrics.topAchievements.map((a, i) => (
                            <span key={i} className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm border border-emerald-500/20">
                              🏅 {a}
                            </span>
                          ))}
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {/* Slide 2: Diagnosis */}
                  {currentSlide === 2 && (
                    <motion.div variants={staggerChildren} initial="hidden" animate="show" className="h-full flex flex-col items-center justify-center text-center space-y-6 p-8">
                      <motion.div variants={staggerItem} className="text-5xl">🧠</motion.div>
                      <motion.h3 variants={staggerItem} className="text-xl font-bold text-emerald-400">
                        {story.insight_title}
                      </motion.h3>
                      <motion.p variants={staggerItem} className="text-foreground/90 text-lg max-w-lg leading-relaxed">
                        {story.narrative_diagnosis}
                      </motion.p>
                      <motion.div variants={staggerItem} className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 max-w-md">
                        <p className="text-muted-foreground text-sm">{story.insight_description}</p>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Slide 3: Projections */}
                  {currentSlide === 3 && (
                    <motion.div variants={staggerChildren} initial="hidden" animate="show" className="h-full p-8 space-y-6">
                      <motion.h3 variants={staggerItem} className="text-xl font-bold text-emerald-400 text-center">🔮 Projeção do Seu Futuro</motion.h3>
                      <div className="flex gap-2 justify-center">
                        {story.projections.map((p, i) => (
                          <motion.button
                            key={i}
                            variants={staggerItem}
                            onClick={() => setSelectedProjection(i)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                              selectedProjection === i
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                                : "bg-card/50 text-muted-foreground border border-border hover:border-emerald-500/50"
                            }`}
                          >
                            {p.period}
                          </motion.button>
                        ))}
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={selectedProjection}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center"
                        >
                          <div className="text-4xl mb-4">
                            {selectedProjection === 0 ? "🌱" : selectedProjection === 1 ? "🌿" : selectedProjection === 2 ? "🌳" : "🏔️"}
                          </div>
                          <h4 className="text-lg font-bold text-foreground mb-2">
                            Em {story.projections[selectedProjection]?.period}
                          </h4>
                          <p className="text-muted-foreground leading-relaxed">
                            {story.projections[selectedProjection]?.description}
                          </p>
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {/* Slide 4: Motivational Quote */}
                  {currentSlide === 4 && (
                    <motion.div variants={staggerChildren} initial="hidden" animate="show" className="h-full flex flex-col items-center justify-center text-center space-y-8 p-8">
                      <motion.div variants={staggerItem} className="relative">
                        <div className="text-7xl">"</div>
                        <motion.div className="absolute -inset-12 bg-emerald-500/5 rounded-full blur-3xl" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 4, repeat: Infinity }} />
                      </motion.div>
                      <motion.p variants={staggerItem} className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent leading-relaxed max-w-lg italic">
                        {story.motivational_quote}
                      </motion.p>
                      <motion.div variants={staggerItem} className="w-16 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
                    </motion.div>
                  )}

                  {/* Slide 5: Closing */}
                  {currentSlide === 5 && (
                    <motion.div variants={staggerChildren} initial="hidden" animate="show" className="h-full flex flex-col items-center justify-center text-center space-y-6 p-8">
                      <motion.div variants={staggerItem} className="text-5xl">💚</motion.div>
                      <motion.h3 variants={staggerItem} className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent leading-relaxed max-w-lg">
                        {story.narrative_closing}
                      </motion.h3>
                      <motion.div variants={staggerItem} className="flex flex-wrap gap-3 justify-center mt-4">
                        <Button variant="outline" className="gap-2 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => {
                          if (navigator.share) {
                            navigator.share({ title: "Minha Jornada FitJourney", text: story.share_caption });
                          } else {
                            navigator.clipboard.writeText(story.share_caption);
                            toast.success("Legenda copiada!");
                          }
                        }}>
                          <Share2 className="w-4 h-4" /> Compartilhar
                        </Button>
                        <Button variant="outline" className="gap-2 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => window.location.href = "/my-diet"}>
                          <Utensils className="w-4 h-4" /> Ver Plano
                        </Button>
                        <Button className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white" onClick={() => window.location.href = "/journey"}>
                          Continuar Jornada <ArrowRight className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 px-4">
              <Button variant="ghost" size="sm" onClick={prev} disabled={currentSlide === 0} className="gap-1 text-muted-foreground">
                <ChevronLeft className="w-4 h-4" /> Anterior
              </Button>
              <span className="text-xs text-muted-foreground">{currentSlide + 1} / {SLIDE_COUNT}</span>
              <Button variant="ghost" size="sm" onClick={next} disabled={currentSlide === SLIDE_COUNT - 1} className="gap-1 text-muted-foreground">
                Próximo <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Regenerate */}
            <div className="text-center mt-4">
              <Button variant="link" size="sm" onClick={generateStory} className="text-muted-foreground gap-1">
                <Sparkles className="w-3 h-3" /> Gerar novamente
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
