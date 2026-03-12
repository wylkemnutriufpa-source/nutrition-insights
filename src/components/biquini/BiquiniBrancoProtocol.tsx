import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Lock, Unlock, Shield, CheckCircle2, Clock,
  Droplets, Apple, Dumbbell, Moon, Target,
  Flame, Heart, Sparkles, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

// Password removed - protocol is open. Delete protection handled separately.

interface ProtocolPhase {
  number: number;
  title: string;
  icon: string;
  color: string;
  weeks: string;
  available: boolean;
  protocol: {
    objective: string;
    dailyTasks: { title: string; icon: React.ReactNode; category: string }[];
    nutritionRules: string[];
    restrictions: string[];
    targets: { label: string; value: string }[];
  };
}

const PROTOCOL_PHASES: ProtocolPhase[] = [
  {
    number: 1,
    title: "Reset Metabólico",
    icon: "🔄",
    color: "from-sky-500 to-cyan-400",
    weeks: "Semanas 1–2",
    available: true,
    protocol: {
      objective: "Normalizar padrões alimentares, regular fome e estabilizar energia metabólica.",
      dailyTasks: [
        { title: "Beber 2.5L de água", icon: <Droplets className="w-4 h-4 text-sky-500" />, category: "Hidratação" },
        { title: "3 refeições principais + 2 lanches", icon: <Apple className="w-4 h-4 text-green-500" />, category: "Alimentação" },
        { title: "Dormir 7–8 horas", icon: <Moon className="w-4 h-4 text-indigo-500" />, category: "Sono" },
        { title: "Registrar todas as refeições no app", icon: <CheckCircle2 className="w-4 h-4 text-primary" />, category: "Registro" },
        { title: "Caminhar 30 minutos", icon: <Dumbbell className="w-4 h-4 text-orange-500" />, category: "Movimento" },
        { title: "Eliminar ultraprocessados", icon: <AlertTriangle className="w-4 h-4 text-red-500" />, category: "Restrição" },
      ],
      nutritionRules: [
        "Priorizar alimentos in natura e minimamente processados",
        "Incluir proteína em todas as refeições principais",
        "Consumir no mínimo 25g de fibra/dia",
        "Evitar açúcar adicionado e bebidas calóricas",
        "Mastigar devagar — mínimo 20 minutos por refeição",
      ],
      restrictions: [
        "Sem refrigerantes e sucos industrializados",
        "Sem frituras e empanados",
        "Sem doces industrializados",
        "Limite de 1 porção de carboidrato refinado/dia",
      ],
      targets: [
        { label: "Proteína", value: "1.5g/kg/dia" },
        { label: "Fibra", value: "≥ 25g/dia" },
        { label: "Água", value: "2.5L/dia" },
        { label: "Sono", value: "7–8h/noite" },
      ],
    },
  },
  {
    number: 2,
    title: "Déficit Estratégico",
    icon: "📉",
    color: "from-orange-500 to-amber-400",
    weeks: "Semanas 3–5",
    available: true,
    protocol: {
      objective: "Iniciar déficit calórico controlado com preservação de massa magra.",
      dailyTasks: [
        { title: "Déficit calórico de 300–500kcal", icon: <Flame className="w-4 h-4 text-orange-500" />, category: "Déficit" },
        { title: "Atingir meta proteica diária", icon: <Target className="w-4 h-4 text-red-500" />, category: "Proteína" },
        { title: "Treino de resistência 4x/semana", icon: <Dumbbell className="w-4 h-4 text-purple-500" />, category: "Treino" },
        { title: "Registrar peso matinal", icon: <CheckCircle2 className="w-4 h-4 text-primary" />, category: "Registro" },
        { title: "Beber 3L de água", icon: <Droplets className="w-4 h-4 text-sky-500" />, category: "Hidratação" },
        { title: "Preparar marmitas semanais", icon: <Apple className="w-4 h-4 text-green-500" />, category: "Planejamento" },
      ],
      nutritionRules: [
        "Déficit calórico moderado: 300–500kcal abaixo do TDEE",
        "Proteína elevada: 1.8–2.2g/kg/dia",
        "Carboidratos priorizados pré e pós-treino",
        "Gorduras saudáveis: 0.8–1g/kg/dia",
        "Volume alimentar com vegetais e saladas",
      ],
      restrictions: [
        "Sem álcool durante a fase",
        "Máximo 1 refeição livre/semana (controlada)",
        "Sem carboidratos refinados à noite",
        "Sem snacks fora do planejamento",
      ],
      targets: [
        { label: "Proteína", value: "2g/kg/dia" },
        { label: "Déficit", value: "300–500kcal" },
        { label: "Treino", value: "4x/semana" },
        { label: "Água", value: "3L/dia" },
      ],
    },
  },
  {
    number: 3,
    title: "Definição Corporal",
    icon: "✨",
    color: "from-purple-500 to-pink-400",
    weeks: "Semanas 6–9",
    available: false,
    protocol: {
      objective: "Fase em desenvolvimento — será liberada em breve.",
      dailyTasks: [],
      nutritionRules: [],
      restrictions: [],
      targets: [],
    },
  },
  {
    number: 4,
    title: "Manutenção Inteligente",
    icon: "🏆",
    color: "from-emerald-500 to-green-400",
    weeks: "Semanas 10–12",
    available: false,
    protocol: {
      objective: "Fase em desenvolvimento — será liberada em breve.",
      dailyTasks: [],
      nutritionRules: [],
      restrictions: [],
      targets: [],
    },
  },
];

export default function BiquiniBrancoProtocol() {
  const [selectedPhase, setSelectedPhase] = useState(1);

  const activePhase = PROTOCOL_PHASES.find(p => p.number === selectedPhase)!;

  return (
    <div className="space-y-4">
      {/* Phase selector */}
      <div className="flex gap-2 flex-wrap">
        {PROTOCOL_PHASES.map(phase => (
          <Button
            key={phase.number}
            size="sm"
            variant={selectedPhase === phase.number ? "default" : "outline"}
            onClick={() => phase.available && setSelectedPhase(phase.number)}
            disabled={!phase.available}
            className={`gap-1.5 ${selectedPhase === phase.number ? `bg-gradient-to-r ${phase.color} text-white border-0` : ""}`}
          >
            <span>{phase.icon}</span>
            Fase {phase.number}
            {!phase.available && <Lock className="w-3 h-3 ml-1" />}
          </Button>
        ))}

        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setIsLocked(true); toast.info("Protocolo bloqueado."); }}
          className="ml-auto text-muted-foreground gap-1"
        >
          <Lock className="w-3 h-3" /> Bloquear
        </Button>
      </div>

      {/* Phase content */}
      {!activePhase.available ? (
        <Card className="glass shadow-card p-8 text-center">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-display font-semibold mb-1">Fase {activePhase.number} — Em Breve</h3>
          <p className="text-sm text-muted-foreground">
            O protocolo da {activePhase.title} está em desenvolvimento e será liberado em uma atualização futura.
          </p>
        </Card>
      ) : (
        <motion.div
          key={selectedPhase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Header */}
          <Card className="glass shadow-card overflow-hidden">
            <div className={`bg-gradient-to-r ${activePhase.color} p-5 text-white`}>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{activePhase.icon}</span>
                <div>
                  <Badge className="bg-white/20 text-white border-0 text-xs mb-1">{activePhase.weeks}</Badge>
                  <h3 className="font-display text-xl font-bold">Fase {activePhase.number}: {activePhase.title}</h3>
                  <p className="text-white/80 text-sm mt-1">{activePhase.protocol.objective}</p>
                </div>
              </div>
            </div>

            {/* Targets */}
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {activePhase.protocol.targets.map(t => (
                  <div key={t.label} className="p-3 rounded-xl bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">{t.label}</p>
                    <p className="font-display font-bold text-sm mt-0.5">{t.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Tasks */}
          <Card className="glass shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" /> Tarefas Diárias do Protocolo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activePhase.protocol.dailyTasks.map((task, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    {task.icon}
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Nutrition Rules & Restrictions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Apple className="w-5 h-5 text-green-500" /> Regras Nutricionais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {activePhase.protocol.nutritionRules.map((rule, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {rule}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="glass shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" /> Restrições da Fase
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {activePhase.protocol.restrictions.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <Heart className="w-4 h-4 text-pink-500 mt-0.5 shrink-0" /> {r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
}
