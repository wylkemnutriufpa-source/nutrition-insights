import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Flame, Trophy, Shield, Brain, Camera, Clock, Zap, Target,
  Activity, ChevronRight, CheckCircle2, BarChart3, TrendingUp,
  Crown, Users, Star, Layers, X
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
  { icon: Shield, title: "Alertas Inteligentes", desc: "Detecção automática de platô, catabolismo, retenção hídrica, fadiga e baixa adesão." },
  { icon: Crown, title: "Prioridade Automática", desc: "Sistema inteligente que prioriza atletas por urgência, fase e risco — sem achismos." },
  { icon: Brain, title: "Decision Engine", desc: "Motor que sugere ajustes de protocolo com motivo, dados e nível de confiança." },
  { icon: Camera, title: "Evolução Visual", desc: "Comparação lado a lado + timeline sequencial de fotos com veredicto visual." },
  { icon: Zap, title: "Daily HQ", desc: "Central diária: quem precisa de check-in, quem tem alerta, quem está em peak week." },
  { icon: Layers, title: "Scoreboard Executivo", desc: "Painel de comando: melhores atletas, piores, tendências, aderência e risco." },
];

const comparisonItems = [
  { feature: "Check-in semanal detalhado", traditional: false, coach: true },
  { feature: "Score composto automatizado", traditional: false, coach: true },
  { feature: "Detecção de platô em tempo real", traditional: false, coach: true },
  { feature: "Priorização automática de atletas", traditional: false, coach: true },
  { feature: "Decision Engine com confiança", traditional: false, coach: true },
  { feature: "Evolução visual com timeline", traditional: false, coach: true },
  { feature: "Central diária do coach", traditional: false, coach: true },
  { feature: "Alertas clínicos persistidos", traditional: false, coach: true },
  { feature: "Selo de acompanhamento premium", traditional: false, coach: true },
];

const differentials = [
  "Sistema que INTERPRETA dados, não apenas exibe",
  "Decisões sugeridas com base clínica real",
  "Prioridade automática por urgência e risco",
  "Visão executiva completa da carteira",
  "Histórico completo de cada ajuste e decisão",
  "Separação total do fluxo clínico tradicional",
  "Preparado para off-season, bulking, cutting, peak week e reverse",
  "Selo premium de consistência para o atleta",
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
            <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Módulo Premium Exclusivo</span>
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-black mb-5">
            Coach <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Bodybuilder</span>
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            O sistema de preparação física mais inteligente do mercado.
            Dados reais. Decisões inteligentes. Resultados visíveis.
          </p>
        </motion.div>

        {/* Benefits grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16"
        >
          {benefits.map((b) => (
            <motion.div
              key={b.title}
              variants={fadeUp}
              className="relative group glass-premium rounded-2xl p-5 border border-border/30 hover:border-orange-500/30 transition-all duration-300"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-3 shadow-lg shadow-orange-500/20">
                  <b.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-display font-bold text-foreground text-sm mb-1.5">{b.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Comparison table */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="glass-premium rounded-3xl p-6 md:p-10 border border-orange-500/15 mb-16 overflow-hidden"
        >
          <h3 className="font-display text-2xl font-bold text-center mb-8">
            Coach Bodybuilder vs{" "}
            <span className="text-muted-foreground">Acompanhamento Comum</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Funcionalidade</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium w-32">Comum</th>
                  <th className="text-center py-3 px-4 w-32">
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">Coach BB</Badge>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonItems.map(item => (
                  <tr key={item.feature} className="border-b border-border/10">
                    <td className="py-2.5 px-4 text-foreground text-xs">{item.feature}</td>
                    <td className="py-2.5 px-4 text-center">
                      <X className="w-4 h-4 text-red-400/50 mx-auto" />
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                O coach que usa{" "}
                <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">inteligência de dados</span>
                {" "}entrega resultados superiores
              </h3>
              <ul className="space-y-3 mb-8">
                {differentials.map(d => (
                  <li key={d} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{d}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/v1/auth">
                  <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/20 gap-2 h-13 px-8 font-semibold w-full sm:w-auto">
                    <Flame className="w-4 h-4" /> Começar Agora
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Badge className="self-center bg-emerald-500/15 text-emerald-400 border-emerald-500/20 px-3 py-1.5">
                  <Star className="w-3 h-3 mr-1" /> Add-on Premium
                </Badge>
              </div>
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

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-background/60 border border-border/50 p-3 text-center">
                  <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-foreground">8</p>
                  <p className="text-[9px] text-muted-foreground">Atletas</p>
                </div>
                <div className="rounded-xl bg-background/60 border border-border/50 p-3 text-center">
                  <BarChart3 className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-foreground">24</p>
                  <p className="text-[9px] text-muted-foreground">Check-ins</p>
                </div>
                <div className="rounded-xl bg-background/60 border border-border/50 p-3 text-center">
                  <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-foreground">12</p>
                  <p className="text-[9px] text-muted-foreground">Decisões</p>
                </div>
              </div>

              <div className="rounded-xl bg-background/60 border border-amber-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-foreground">Sugestão do Motor</span>
                  <Badge variant="outline" className="ml-auto text-[9px] text-emerald-400 border-emerald-500/30">Confiança Alta</Badge>
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
