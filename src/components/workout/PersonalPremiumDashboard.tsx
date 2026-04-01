import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Layers, CalendarDays, TrendingUp, Heart, Ruler, Trophy,
  ArrowRightLeft, MessageCircle, FileText, Sparkles, BookOpen,
  ClipboardList, BarChart3, Zap, Command, Dumbbell,
  Users, ArrowRight, Plus, Target, Flame, Activity, Film
} from "lucide-react";

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

const QUICK_ACTIONS = [
  { id: "create", label: "Novo Plano", icon: Plus, color: "text-emerald-400", bg: "from-emerald-500/20 to-emerald-500/5" },
  { id: "templates", label: "Templates", icon: Sparkles, color: "text-pink-400", bg: "from-pink-500/20 to-pink-500/5" },
  { id: "preplan", label: "Pré-Plano IA", icon: Zap, color: "text-purple-400", bg: "from-purple-500/20 to-purple-500/5" },
  { id: "videos", label: "Vídeos", icon: Film, color: "text-red-400", bg: "from-red-500/20 to-red-500/5" },
  { id: "library", label: "Biblioteca", icon: BookOpen, color: "text-lime-400", bg: "from-lime-500/20 to-lime-500/5" },
];

const WORKOUT_MODULES: ModuleCard[] = [
  { id: "plans", title: "Planos de Treino", description: "Gerencie todos os planos ativos", icon: Layers, color: "text-blue-400", bgColor: "from-blue-500/15 to-blue-500/5" },
  { id: "calendar", title: "Calendário", description: "Agenda e aderência mensal", icon: CalendarDays, color: "text-emerald-400", bgColor: "from-emerald-500/15 to-emerald-500/5" },
  { id: "evolution", title: "Evolução de Carga", description: "Progressão de volume e peso", icon: TrendingUp, color: "text-cyan-400", bgColor: "from-cyan-500/15 to-cyan-500/5" },
  { id: "periodization", title: "Periodização", description: "Planejamento por blocos", icon: BarChart3, color: "text-violet-400", bgColor: "from-violet-500/15 to-violet-500/5", badge: "Avançado" },
];

const ASSESSMENT_MODULES: ModuleCard[] = [
  { id: "cardio", title: "Cardio & Zonas FC", description: "Prescrição por zonas de FC", icon: Heart, color: "text-rose-400", bgColor: "from-rose-500/15 to-rose-500/5" },
  { id: "assessments", title: "Avaliações Físicas", description: "Composição corporal e testes", icon: Ruler, color: "text-amber-400", bgColor: "from-amber-500/15 to-amber-500/5" },
  { id: "comparison", title: "Comparativo", description: "Deltas entre avaliações", icon: ArrowRightLeft, color: "text-teal-400", bgColor: "from-teal-500/15 to-teal-500/5" },
  { id: "anamnesis", title: "Anamnese", description: "Histórico de saúde e objetivos", icon: ClipboardList, color: "text-sky-400", bgColor: "from-sky-500/15 to-sky-500/5" },
];

const ENGAGEMENT_MODULES: ModuleCard[] = [
  { id: "records", title: "Recordes Pessoais", description: "PRs e conquistas", icon: Trophy, color: "text-yellow-400", bgColor: "from-yellow-500/15 to-yellow-500/5", badge: "🏆" },
  { id: "challenges", title: "Desafios & Metas", description: "Gamificação e XP", icon: Zap, color: "text-orange-400", bgColor: "from-orange-500/15 to-orange-500/5" },
  { id: "chat", title: "Chat com Aluno", description: "Comunicação direta", icon: MessageCircle, color: "text-indigo-400", bgColor: "from-indigo-500/15 to-indigo-500/5" },
  { id: "export", title: "Exportar PDF", description: "PDFs profissionais", icon: FileText, color: "text-slate-400", bgColor: "from-slate-500/15 to-slate-500/5" },
];

interface Props {
  onNavigate: (tabId: string) => void;
  studentsCount: number;
  plansCount: number;
}

export default function PersonalPremiumDashboard({ onNavigate, studentsCount, plansCount }: Props) {
  return (
    <div className="space-y-6">
      {/* ── IFJ Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onClick={() => onNavigate("ifj")}
        className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-card cursor-pointer transition-all duration-300 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/10"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent pointer-events-none" />
        <div className="absolute inset-0 premium-shimmer pointer-events-none opacity-40" />
        <div className="relative p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
            <Command className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base font-bold group-hover:text-amber-400 transition-colors truncate">Painel IFJ — Inteligência FitJourney</h2>
              <Badge className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30 text-[10px] shrink-0">Premium</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Copiloto inteligente, briefing preditivo e insights da sua carteira</p>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-400/50 group-hover:text-amber-400 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
        </div>
      </motion.div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Alunos Ativos", value: String(studentsCount), icon: Users, color: "text-emerald-400", accent: "from-emerald-500/10" },
          { label: "Planos Ativos", value: String(plansCount), icon: Dumbbell, color: "text-blue-400", accent: "from-blue-500/10" },
          { label: "Ferramentas", value: "16", icon: Activity, color: "text-amber-400", accent: "from-amber-500/10" },
          { label: "IFJ", value: "ON", icon: Command, color: "text-purple-400", accent: "from-purple-500/10" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.accent} to-transparent pointer-events-none opacity-50`} />
          </motion.div>
        ))}
      </div>

      {/* ── Quick Actions — Atalhos de Elaboração ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
      >
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          Atalhos Rápidos — Elaborar Treino
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action, i) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              onClick={() => {
                if (action.id === "create") {
                  // Navigate to plans tab which has the "Novo Plano" button
                  onNavigate("plans");
                } else {
                  onNavigate(action.id);
                }
              }}
              className={`group relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 text-left transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${action.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
              <div className="relative flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform duration-300`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-semibold group-hover:text-primary transition-colors">{action.label}</span>
                  {action.id === "create" && (
                    <p className="text-[10px] text-muted-foreground">Criar do zero</p>
                  )}
                  {action.id === "templates" && (
                    <p className="text-[10px] text-muted-foreground">12 prontos</p>
                  )}
                  {action.id === "preplan" && (
                    <p className="text-[10px] text-muted-foreground">Baseado na anamnese</p>
                  )}
                  {action.id === "videos" && (
                    <p className="text-[10px] text-muted-foreground">Drag & drop</p>
                  )}
                  {action.id === "library" && (
                    <p className="text-[10px] text-muted-foreground">Exercícios + vídeos</p>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── Módulos de Treino ── */}
      <ModuleSection
        title="Treino & Planejamento"
        icon={<Target className="w-3.5 h-3.5 text-blue-400" />}
        modules={WORKOUT_MODULES}
        onNavigate={onNavigate}
        delay={0.25}
      />

      {/* ── Avaliação & Saúde ── */}
      <ModuleSection
        title="Avaliação & Saúde"
        icon={<Heart className="w-3.5 h-3.5 text-rose-400" />}
        modules={ASSESSMENT_MODULES}
        onNavigate={onNavigate}
        delay={0.3}
      />

      {/* ── Engajamento & Comunicação ── */}
      <ModuleSection
        title="Engajamento & Comunicação"
        icon={<Zap className="w-3.5 h-3.5 text-orange-400" />}
        modules={ENGAGEMENT_MODULES}
        onNavigate={onNavigate}
        delay={0.35}
      />
    </div>
  );
}

/* ── Reusable section renderer ── */
function ModuleSection({ title, icon, modules, onNavigate, delay }: {
  title: string;
  icon: React.ReactNode;
  modules: ModuleCard[];
  onNavigate: (id: string) => void;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {modules.map((mod, i) => (
          <motion.div
            key={mod.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + i * 0.03, duration: 0.25 }}
            onClick={() => onNavigate(mod.id)}
            className="group relative overflow-hidden rounded-xl border border-border/50 bg-card cursor-pointer transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${mod.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
            <div className="relative p-4 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center ${mod.color} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                <mod.icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold group-hover:text-primary transition-colors truncate">{mod.title}</h3>
                  {mod.badge && (
                    <Badge variant={mod.badgeVariant || "outline"} className="text-[9px] px-1 py-0 shrink-0">{mod.badge}</Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{mod.description}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300 shrink-0 mt-1" />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
