import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Flame, Trophy, Shield, Brain, Camera, Clock, Zap, Target,
  Activity, ChevronRight, CheckCircle2, BarChart3, TrendingUp
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const benefits = [
  { icon: Activity, title: "Check-ins Avançados", desc: "8 marcadores subjetivos, peso, aderência e volume de treino em cada check-in." },
  { icon: Trophy, title: "Score de Preparação", desc: "Score composto 0-100 com subtópicos: físico, adesão, recuperação, performance e risco." },
  { icon: Shield, title: "Alertas Inteligentes", desc: "Detecção de platô, catabolismo, retenção hídrica, fadiga e baixa adesão." },
  { icon: Clock, title: "Timeline Completa", desc: "Histórico visual de decisões, análises, mudanças de fase e observações." },
  { icon: Brain, title: "Decision Engine", desc: "Motor que sugere ajustes de protocolo com motivo, dados e nível de confiança." },
  { icon: Camera, title: "Evolução Visual", desc: "Comparação lado a lado de fotos semanais (frente, lado, costas) com upload real." },
];

const differentials = [
  "Sistema que INTERPRETA dados, não apenas exibe",
  "Decisões sugeridas com base clínica real",
  "Histórico completo de cada ajuste",
  "Separação total do fluxo clínico tradicional",
  "Preparado para off-season, bulking, cutting, peak week e reverse",
  "Central operacional com visão executiva da equipe",
];

export default function CoachBodybuilderLandingSection() {
  return (
    <section id="coach-bodybuilder" className="py-28 px-4 relative overflow-hidden">
      {/* BG decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-orange-500/5 via-red-600/5 to-transparent blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass-premium text-xs font-bold mb-6 uppercase tracking-widest border border-orange-500/20">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Módulo Premium</span>
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-black mb-5">
            Coach <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Bodybuilder</span>
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            O sistema mais avançado de acompanhamento de atletas e preparação física.
            Decisões inteligentes, não achismos.
          </p>
        </motion.div>

        {/* Benefits grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16"
        >
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              variants={fadeUp}
              className="relative group glass-premium rounded-2xl p-6 border border-border/30 hover:border-orange-500/30 transition-all duration-300"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/20">
                  <b.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-display font-bold text-foreground mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Differentials + CTA */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          className="relative glass-premium rounded-3xl p-8 md:p-12 border border-orange-500/15 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-600/5" />
          <div className="relative grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="font-display text-2xl md:text-3xl font-bold mb-6">
                Por que coaches escolhem o{" "}
                <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">FitJourney</span>?
              </h3>
              <ul className="space-y-3.5 mb-8">
                {differentials.map(d => (
                  <li key={d} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{d}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/20 gap-2 h-13 px-8 font-semibold">
                  <Flame className="w-4 h-4" /> Começar Agora
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Visual mock */}
            <div className="hidden md:flex flex-col gap-4">
              <div className="rounded-xl bg-background/60 border border-border/50 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">Score de Preparação</p>
                    <p className="text-xs text-muted-foreground">Atleta em evolução constante</p>
                  </div>
                  <span className="ml-auto text-2xl font-black text-emerald-400">87</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 w-[87%]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-background/60 border border-border/50 p-4 text-center">
                  <BarChart3 className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                  <p className="text-lg font-black text-foreground">12</p>
                  <p className="text-[10px] text-muted-foreground">Check-ins</p>
                </div>
                <div className="rounded-xl bg-background/60 border border-border/50 p-4 text-center">
                  <Zap className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-foreground">5</p>
                  <p className="text-[10px] text-muted-foreground">Decisões</p>
                </div>
              </div>

              <div className="rounded-xl bg-background/60 border border-amber-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-foreground">Sugestão do Motor</span>
                </div>
                <p className="text-xs text-muted-foreground">Considerar aumento de 15g de carboidrato nos dias de treino para melhorar pump e recuperação.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
