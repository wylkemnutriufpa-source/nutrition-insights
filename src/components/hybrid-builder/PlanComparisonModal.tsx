import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, Brain, Stethoscope, Check, Trash2, Loader2, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type GenerationMode = "quick" | "smart" | "clinical";

interface GeneratedPlan {
  mode: GenerationMode;
  mealPlanId: string;
  itemsCount: number;
  generating: boolean;
  error?: string;
  items?: any[];
  dailySummary?: { day: number; kcal: number; protein: number; meals: number }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  plans: GeneratedPlan[];
  onSelect: (planId: string, mode: GenerationMode) => void;
  selecting: boolean;
}

const MODE_CONFIG: Record<GenerationMode, { icon: typeof Zap; label: string; color: string; desc: string }> = {
  quick: { icon: Zap, label: "⚡ Rápido", color: "bg-amber-500/10 text-amber-600 border-amber-500/30", desc: "Geração rápida com presets" },
  smart: { icon: Brain, label: "🧠 Inteligente", color: "bg-blue-500/10 text-blue-600 border-blue-500/30", desc: "IFJ + perfil comportamental" },
  clinical: { icon: Stethoscope, label: "👨‍⚕️ Clínico", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", desc: "Protocolos clínicos + flags" },
};

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "☀️ Café",
  morning_snack: "🍎 Lanche AM",
  lunch: "🍽️ Almoço",
  afternoon_snack: "🍪 Lanche PM",
  dinner: "🌙 Jantar",
  supper: "🫖 Ceia",
};

function DaySummaryRow({ day, kcal, protein, meals }: { day: number; kcal: number; protein: number; meals: number }) {
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return (
    <div className="flex items-center justify-between text-[10px] py-1 border-b border-border/30 last:border-0">
      <span className="font-medium w-8">{dayLabels[day] || `D${day}`}</span>
      <span className="text-muted-foreground">{meals} ref</span>
      <span className="font-mono font-semibold">{kcal} kcal</span>
      <span className="text-muted-foreground">{protein}g prot</span>
    </div>
  );
}

function PlanCard({ plan, onSelect, selecting, isSelected }: { 
  plan: GeneratedPlan; 
  onSelect: () => void; 
  selecting: boolean;
  isSelected: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = MODE_CONFIG[plan.mode];
  const Icon = config.icon;

  if (plan.generating) {
    return (
      <div className="border rounded-xl p-4 bg-muted/20 flex flex-col items-center justify-center min-h-[200px] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Gerando {config.label}...</p>
      </div>
    );
  }

  if (plan.error) {
    return (
      <div className="border rounded-xl p-4 bg-destructive/5 border-destructive/20 min-h-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-destructive" />
          <span className="text-xs font-semibold">{config.label}</span>
        </div>
        <p className="text-[10px] text-destructive">{plan.error}</p>
      </div>
    );
  }

  const totalKcal = plan.dailySummary?.reduce((s, d) => s + d.kcal, 0) || 0;
  const avgKcal = plan.dailySummary?.length ? Math.round(totalKcal / plan.dailySummary.length) : 0;
  const totalProtein = plan.dailySummary?.reduce((s, d) => s + d.protein, 0) || 0;
  const avgProtein = plan.dailySummary?.length ? Math.round(totalProtein / plan.dailySummary.length) : 0;

  return (
    <motion.div
      layout
      className={`border rounded-xl p-4 transition-all cursor-pointer ${
        isSelected 
          ? "border-primary ring-2 ring-primary/20 bg-primary/5" 
          : "hover:border-primary/40 hover:shadow-md"
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="text-xs font-bold">{config.label}</span>
        </div>
        <Badge variant="outline" className={`text-[9px] ${config.color}`}>
          {plan.itemsCount} itens
        </Badge>
      </div>
      <p className="text-[10px] text-muted-foreground mb-3">{config.desc}</p>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-muted/40 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Média/dia</p>
          <p className="text-sm font-bold">{avgKcal} kcal</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Proteína/dia</p>
          <p className="text-sm font-bold">{avgProtein}g</p>
        </div>
      </div>

      {/* Expandable daily breakdown */}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="flex items-center gap-1 text-[10px] text-primary hover:underline w-full justify-center mb-2"
      >
        <Eye className="w-3 h-3" />
        {expanded ? "Ocultar detalhes" : "Ver por dia"}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {expanded && plan.dailySummary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-muted/20 rounded-lg p-2">
              {plan.dailySummary.map((d) => (
                <DaySummaryRow key={d.day} {...d} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Select button */}
      <Button
        size="sm"
        variant={isSelected ? "default" : "outline"}
        className="w-full mt-3 h-8 text-xs gap-1"
        disabled={selecting}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        {selecting && isSelected ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : isSelected ? (
          <>
            <Check className="w-3 h-3" /> Selecionado
          </>
        ) : (
          "Escolher este"
        )}
      </Button>
    </motion.div>
  );
}

export default function PlanComparisonModal({ open, onClose, plans, onSelect, selecting }: Props) {
  const [selectedMode, setSelectedMode] = useState<GenerationMode | null>(null);
  const allDone = plans.every(p => !p.generating);
  const hasAnyPlan = plans.some(p => p.mealPlanId && !p.error);

  const handleSelect = (planId: string, mode: GenerationMode) => {
    setSelectedMode(mode);
    onSelect(planId, mode);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !selecting && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-primary" />
            Compare e Escolha o Melhor Plano
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {allDone 
              ? "3 planos gerados com combinações únicas. Escolha o que mais se adequa ao paciente."
              : "Gerando 3 variações em paralelo..."
            }
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-1">
            {plans.map((plan) => (
              <PlanCard
                key={plan.mode}
                plan={plan}
                onSelect={() => handleSelect(plan.mealPlanId, plan.mode)}
                selecting={selecting}
                isSelected={selectedMode === plan.mode}
              />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
