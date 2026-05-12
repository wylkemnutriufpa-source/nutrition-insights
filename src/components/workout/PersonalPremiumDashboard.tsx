import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Layers, CalendarDays, TrendingUp, Heart, Ruler, Trophy,
  ArrowRightLeft, MessageCircle, FileText, Sparkles, BookOpen,
  ClipboardList, BarChart3, Zap, Command, Dumbbell,
  Users, ArrowRight, Plus, Target, Flame, Activity, Film
} from "lucide-react";

/* ─── Quick Action Cards ─── */
const QUICK_ACTIONS = [
  { id: "create", label: "Novo Plano", sub: "Criar do zero", icon: Plus, color: "text-emerald-400", border: "border-emerald-500/20 hover:border-emerald-500/40", glow: "from-emerald-500/15 to-emerald-500/5" },
  { id: "templates", label: "Templates", sub: "Modelos prontos", icon: Sparkles, color: "text-pink-400", border: "border-pink-500/20 hover:border-pink-500/40", glow: "from-pink-500/15 to-pink-500/5" },
  { id: "preplan", label: "Pré-Plano IA", sub: "Anamnese → plano", icon: Zap, color: "text-purple-400", border: "border-purple-500/20 hover:border-purple-500/40", glow: "from-purple-500/15 to-purple-500/5" },
  { id: "videos", label: "Vídeos", sub: "Exercícios em vídeo", icon: Film, color: "text-red-400", border: "border-red-500/20 hover:border-red-500/40", glow: "from-red-500/15 to-red-500/5" },
  { id: "library", label: "Biblioteca", sub: "Exercícios + base", icon: BookOpen, color: "text-lime-400", border: "border-lime-500/20 hover:border-lime-500/40", glow: "from-lime-500/15 to-lime-500/5" },
];

/* ─── Module Sections ─── */
interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  glow: string;
  badge?: string;
}

const SECTIONS: { title: string; icon: React.ElementType; iconColor: string; modules: ModuleCard[] }[] = [
  {
    title: "Treino & Planejamento",
    icon: Target,
    iconColor: "text-blue-400",
    modules: [
      { id: "plans", title: "Planos de Treino", description: "Gerencie todos os planos ativos", icon: Layers, color: "text-blue-400", glow: "from-blue-500/10 to-transparent" },
      { id: "calendar", title: "Calendário", description: "Agenda e aderência mensal", icon: CalendarDays, color: "text-emerald-400", glow: "from-emerald-500/10 to-transparent" },
      { id: "evolution", title: "Evolução de Carga", description: "Progressão de volume e peso", icon: TrendingUp, color: "text-cyan-400", glow: "from-cyan-500/10 to-transparent" },
      { id: "periodization", title: "Periodização", description: "Planejamento por blocos", icon: BarChart3, color: "text-violet-400", glow: "from-violet-500/10 to-transparent", badge: "Avançado" },
    ],
  },
  {
    title: "Avaliação & Saúde",
    icon: Heart,
    iconColor: "text-rose-400",
    modules: [
      { id: "cardio", title: "Cardio & Zonas FC", description: "Prescrição por zonas de FC", icon: Heart, color: "text-rose-400", glow: "from-rose-500/10 to-transparent" },
      { id: "assessments", title: "Avaliações Físicas", description: "Composição corporal e testes", icon: Ruler, color: "text-amber-400", glow: "from-amber-500/10 to-transparent" },
      { id: "comparison", title: "Comparativo", description: "Deltas entre avaliações", icon: ArrowRightLeft, color: "text-teal-400", glow: "from-teal-500/10 to-transparent" },
      { id: "anamnesis", title: "Anamnese", description: "Histórico de saúde e objetivos", icon: ClipboardList, color: "text-sky-400", glow: "from-sky-500/10 to-transparent" },
    ],
  },
  {
    title: "Engajamento & Comunicação",
    icon: Zap,
    iconColor: "text-orange-400",
    modules: [
      { id: "records", title: "Recordes Pessoais", description: "PRs e conquistas", icon: Trophy, color: "text-yellow-400", glow: "from-yellow-500/10 to-transparent", badge: "🏆" },
      { id: "challenges", title: "Desafios & Metas", description: "Gamificação e XP", icon: Zap, color: "text-orange-400", glow: "from-orange-500/10 to-transparent" },
      { id: "chat", title: "Chat com Aluno", description: "Comunicação direta", icon: MessageCircle, color: "text-indigo-400", glow: "from-indigo-500/10 to-transparent" },
      { id: "export", title: "Exportar PDF", description: "PDFs profissionais", icon: FileText, color: "text-slate-400", glow: "from-slate-500/10 to-transparent" },
    ],
  },
];

/* ─── Props ─── */
interface Props {
  onNavigate: (tabId: string) => void;
  onStartCreating: () => void;
  studentsCount: number;
  plansCount: number;
}

/* ─── Main Component ─── */
export default function PersonalPremiumDashboard({ onNavigate, onStartCreating, studentsCount, plansCount }: Props) {

  const handleQuickAction = (id: string) => {
    if (id === "create") {
      onStartCreating();
    } else {
      onNavigate(id);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── IFJ Hero ── */}
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        onClick={() => onNavigate("ifj")}
        className="w-full text-left group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-card transition-all duration-300 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent pointer-events-none" />
        <div className="relative p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform duration-300 shrink-0">
            <Command className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base font-bold group-hover:text-amber-400 transition-colors truncate">Painel IFJ — Inteligência FitJourney</h2>
              <Badge className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30 text-[10px] shrink-0">Premium</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Copiloto inteligente, briefing preditivo e insights da sua carteira</p>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-400/40 group-hover:text-amber-400 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
        </div>
      </motion.button>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Alunos Ativos", value: String(studentsCount), icon: Users, color: "text-emerald-400", accent: "from-emerald-500/8" },
          { label: "Planos Ativos", value: String(plansCount), icon: Dumbbell, color: "text-blue-400", accent: "from-blue-500/8" },
          { label: "Ferramentas", value: "16", icon: Activity, color: "text-amber-400", accent: "from-amber-500/8" },
          { label: "IFJ", value: "ON", icon: Command, color: "text-purple-400", accent: "from-purple-500/8" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 + i * 0.05, duration: 0.35 }}
            className="relative overflow-hidden rounded-xl border border-border/40 bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold mt-1 tracking-tight">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.accent} to-transparent pointer-events-none`} />
          </motion.div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.35 }}
      >
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          Atalhos Rápidos
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUICK_ACTIONS.map((a, i) => (
            <motion.button
              key={a.id}
              type="button"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.22 + i * 0.04 }}
              onClick={() => handleQuickAction(a.id)}
              className={`group relative overflow-hidden rounded-xl border ${a.border} bg-card p-4 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${a.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
              <div className="relative flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center ${a.color} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                  <a.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold block truncate group-hover:text-primary transition-colors">{a.label}</span>
                  <span className="text-[10px] text-muted-foreground block truncate">{a.sub}</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ── Module Sections ── */}
      {SECTIONS.map((section, si) => (
        <motion.section
          key={section.title}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 + si * 0.06, duration: 0.35 }}
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <section.icon className={`w-3.5 h-3.5 ${section.iconColor}`} />
            {section.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {section.modules.map((mod, mi) => (
              <motion.button
                key={mod.id}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + si * 0.06 + mi * 0.03, duration: 0.25 }}
                onClick={() => onNavigate(mod.id)}
                className="group relative overflow-hidden rounded-xl border border-border/40 bg-card text-left transition-all duration-300 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${mod.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                <div className="relative p-4 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center ${mod.color} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                    <mod.icon className="w-[18px] h-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{mod.title}</h3>
                      {mod.badge && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">{mod.badge}</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{mod.description}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/25 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300 shrink-0 mt-1" />
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>
      ))}
    </div>
  );
}
