import { motion } from "framer-motion";
import { Clock, Sparkles, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fmtMacro, safeNum, isMacroInconsistent, isCalorieClamped } from "@/lib/formatMacros";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const mealTypeLabels: Record<string, { label: string; emoji: string }> = {
  breakfast: { label: "Café da manhã", emoji: "☕" },
  morning_snack: { label: "Lanche manhã", emoji: "🍌" },
  lunch: { label: "Almoço", emoji: "🍽️" },
  afternoon_snack: { label: "Lanche tarde", emoji: "🍎" },
  dinner: { label: "Jantar", emoji: "🌙" },
  evening_snack: { label: "Ceia", emoji: "🫖" },
};

interface MealCardProps {
  title: string;
  mealType: string;
  loggedAt: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  aiScore?: number | null;
  aiFeedback?: string | null;
  imageUrl?: string | null;
  xpEarned: number;
}

export default function MealCard({
  title, mealType, loggedAt, calories, protein, carbs, fat,
  aiScore, aiFeedback, imageUrl, xpEarned,
}: MealCardProps) {
  const type = mealTypeLabels[mealType] || { label: mealType, emoji: "🍽️" };
  const time = new Date(loggedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const date = new Date(loggedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="glass rounded-xl overflow-hidden shadow-card"
    >
      {imageUrl && (
        <div className="h-32 bg-muted overflow-hidden">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span>{type.emoji}</span>
              <Badge variant="secondary" className="text-xs">{type.label}</Badge>
            </div>
            <h3 className="font-display font-semibold">{title}</h3>
          </div>
          {aiScore !== null && aiScore !== undefined && (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
              aiScore >= 80 ? "bg-success/10 text-success" :
              aiScore >= 60 ? "bg-warning/10 text-warning" :
              "bg-destructive/10 text-destructive"
            }`}>
              {aiScore}
            </div>
          )}
        </div>

        {(safeNum(calories) || safeNum(protein) || safeNum(carbs) || safeNum(fat)) > 0 && (
          <div className="space-y-2 mt-3">
            <div className="grid grid-cols-4 gap-2" data-macro-tile="meal-card">
              {[
                { label: "Kcal", value: calories, key: "kcal" },
                { label: "Prot", value: protein, unit: "g", key: "protein" },
                { label: "Carb", value: carbs, unit: "g", key: "carbs" },
                { label: "Gord", value: fat, unit: "g", key: "fat" },
              ].map((m) => (
                <div key={m.label} className="text-center p-2 rounded-lg bg-muted/50" data-macro={m.key}>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="font-bold text-sm" data-macro-value={m.key}>
                    {m.value != null ? `${fmtMacro(m.value)}${m.unit ?? ""}` : "-"}
                  </p>
                </div>
              ))}
            </div>
            
            {(isMacroInconsistent(calories || 0, protein || 0, carbs || 0, fat || 0) || isCalorieClamped(calories || 0)) && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-[10px] text-amber-700 font-medium">
                  {isCalorieClamped(calories || 0) 
                    ? "Calorias ajustadas para o limite de segurança." 
                    : "Macros recalculados para manter consistência calórica."}
                </span>
              </div>
            )}
          </div>
        )}

        {aiFeedback && (
          <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-1 mb-1">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-primary">Feedback IA</span>
            </div>
            <p className="text-xs text-muted-foreground">{aiFeedback}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{date} • {time}</span>
          </div>
          {xpEarned > 0 && (
            <span className="text-xs font-bold text-primary">+{xpEarned} XP</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
