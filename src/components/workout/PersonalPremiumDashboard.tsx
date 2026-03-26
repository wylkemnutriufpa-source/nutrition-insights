import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Layers, CalendarDays, TrendingUp, Heart, Ruler, Trophy,
  ArrowRightLeft, MessageCircle, FileText, Sparkles, BookOpen,
  ClipboardList, BarChart3, Zap, Timer, Command, Dumbbell,
  Users, AlertTriangle, ArrowRight
} from "lucide-react";

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  stat?: string;
}

const modules: ModuleCard[] = [
  {
    id: "plans",
    title: "Planos de Treino",
    description: "Crie, edite e gerencie todos os planos dos seus alunos",
    icon: Layers,
    color: "text-blue-400",
    gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
  },
  {
    id: "calendar",
    title: "Calendário",
    description: "Visualize a aderência e agenda de treinos mensal",
    icon: CalendarDays,
    color: "text-emerald-400",
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
  },
  {
    id: "evolution",
    title: "Evolução de Carga",
    description: "Gráficos de progressão de volume e peso por exercício",
    icon: TrendingUp,
    color: "text-cyan-400",
    gradient: "from-cyan-500/20 via-cyan-500/5 to-transparent",
  },
  {
    id: "periodization",
    title: "Periodização",
    description: "Planejamento linear, ondulatório e por blocos",
    icon: BarChart3,
    color: "text-violet-400",
    gradient: "from-violet-500/20 via-violet-500/5 to-transparent",
    badge: "Avançado",
  },
  {
    id: "cardio",
    title: "Cardio & Zonas FC",
    description: "Prescrição de aeróbico por zonas de frequência cardíaca",
    icon: Heart,
    color: "text-rose-400",
    gradient: "from-rose-500/20 via-rose-500/5 to-transparent",
  },
  {
    id: "assessments",
    title: "Avaliações Físicas",
    description: "Dobras cutâneas, composição corporal e testes de fitness",
    icon: Ruler,
    color: "text-amber-400",
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
  },
  {
    id: "comparison",
    title: "Comparativo",
    description: "Deltas históricos e tendências entre avaliações",
    icon: ArrowRightLeft,
    color: "text-teal-400",
    gradient: "from-teal-500/20 via-teal-500/5 to-transparent",
  },
  {
    id: "records",
    title: "Recordes Pessoais",
    description: "Detecção automática de PRs e histórico de conquistas",
    icon: Trophy,
    color: "text-yellow-400",
    gradient: "from-yellow-500/20 via-yellow-500/5 to-transparent",
    badge: "🏆 PRs",
  },
  {
    id: "challenges",
    title: "Desafios & Metas",
    description: "Gamificação com XP, desafios semanais e rankings",
    icon: Zap,
    color: "text-orange-400",
    gradient: "from-orange-500/20 via-orange-500/5 to-transparent",
  },
  {
    id: "chat",
    title: "Chat PT ↔ Aluno",
    description: "Comunicação direta com notificações e badges",
    icon: MessageCircle,
    color: "text-indigo-400",
    gradient: "from-indigo-500/20 via-indigo-500/5 to-transparent",
  },
  {
    id: "export",
    title: "Exportar Treinos",
    description: "Gere PDFs profissionais dos planos de treino",
    icon: FileText,
    color: "text-slate-400",
    gradient: "from-slate-500/20 via-slate-500/5 to-transparent",
  },
  {
    id: "templates",
    title: "Templates Prontos",
    description: "12 protocolos profissionais editáveis e reutilizáveis",
    icon: Sparkles,
    color: "text-pink-400",
    gradient: "from-pink-500/20 via-pink-500/5 to-transparent",
    badge: "12 prontos",
    badgeVariant: "secondary",
  },
  {
    id: "library",
    title: "Biblioteca de Exercícios",
    description: "Base completa com vídeos de execução e instruções",
    icon: BookOpen,
    color: "text-lime-400",
    gradient: "from-lime-500/20 via-lime-500/5 to-transparent",
  },
  {
    id: "anamnesis",
    title: "Anamnese",
    description: "Avalie histórico de saúde e objetivos dos alunos",
    icon: ClipboardList,
    color: "text-sky-400",
    gradient: "from-sky-500/20 via-sky-500/5 to-transparent",
  },
  {
    id: "preplan",
    title: "Pré-Plano IA",
    description: "Geração automática de treino baseada na anamnese",
    icon: Sparkles,
    color: "text-purple-400",
    gradient: "from-purple-500/20 via-purple-500/5 to-transparent",
    badge: "IA",
    badgeVariant: "default",
  },
  {
    id: "ifj",
    title: "Painel IFJ",
    description: "Inteligência FitJourney — copiloto, briefing e insights",
    icon: Command,
    color: "text-amber-400",
    gradient: "from-amber-500/15 via-yellow-500/5 to-transparent",
    badge: "Premium",
    badgeVariant: "default",
  },
];

interface Props {
  onNavigate: (tabId: string) => void;
  studentsCount: number;
  plansCount: number;
}

export default function PersonalPremiumDashboard({ onNavigate, studentsCount, plansCount }: Props) {
  // Separate IFJ from other modules
  const ifjModule = modules.find(m => m.id === "ifj")!;
  const otherModules = modules.filter(m => m.id !== "ifj");

  return (
    <div className="space-y-6">
      {/* IFJ Hero Card — Featured */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onClick={() => onNavigate("ifj")}
        className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-card cursor-pointer transition-all duration-300 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/10"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent pointer-events-none" />
        <div className="absolute inset-0 premium-shimmer pointer-events-none opacity-40" />
        <div className="relative p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
            <Command className="w-7 h-7 text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold group-hover:text-amber-400 transition-colors">Painel IFJ — Inteligência FitJourney</h2>
              <Badge className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                Premium
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Copiloto inteligente, briefing preditivo, prioridades em tempo real e insights da sua carteira
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-400/50 group-hover:text-amber-400 group-hover:translate-x-1 transition-all duration-300" />
        </div>
      </motion.div>

      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Alunos Ativos", value: String(studentsCount), icon: Users, color: "text-emerald-400" },
          { label: "Planos Ativos", value: String(plansCount), icon: Dumbbell, color: "text-blue-400" },
          { label: "Ferramentas", value: "16", icon: Zap, color: "text-amber-400" },
          { label: "IFJ", value: "ON", icon: Command, color: "text-purple-400" },
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
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/[0.03] pointer-events-none" />
          </motion.div>
        ))}
      </div>

      {/* Module Cards Grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Módulos & Ferramentas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {otherModules.map((mod, i) => (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.03, duration: 0.3 }}
              onClick={() => onNavigate(mod.id)}
              className="group relative overflow-hidden rounded-xl border border-border/50 bg-card cursor-pointer transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              {/* Gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${mod.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

              {/* Premium shimmer on IFJ card */}
              {mod.id === "ifj" && (
                <div className="absolute inset-0 premium-shimmer pointer-events-none opacity-50" />
              )}

              <div className="relative p-4 flex flex-col h-full min-h-[140px]">
                {/* Top row: icon + badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center ${mod.color} group-hover:scale-110 transition-transform duration-300`}>
                    <mod.icon className="w-5 h-5" />
                  </div>
                  {mod.badge && (
                    <Badge
                      variant={mod.badgeVariant || "outline"}
                      className={`text-[10px] px-1.5 py-0 ${mod.id === "ifj" ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30" : ""}`}
                    >
                      {mod.badge}
                    </Badge>
                  )}
                </div>

                {/* Title + Description */}
                <h3 className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors duration-200">
                  {mod.title}
                </h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed flex-1">
                  {mod.description}
                </p>

                {/* Bottom arrow */}
                <div className="mt-3 flex items-center justify-end">
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
