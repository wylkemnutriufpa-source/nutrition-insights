import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Check, Trophy, Medal, Award } from "lucide-react";
import { motion } from "framer-motion";
import type { NutritionalStrategy, SizeVariant } from "@/lib/strategyAdvisor";

interface Props {
  strategy: NutritionalStrategy;
  rank: number;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onSizeChange: (size: SizeVariant) => void;
}

const RANK_ICONS = [Trophy, Medal, Award];
const RANK_COLORS = [
  "from-amber-500/20 to-amber-600/5 border-amber-500/40",
  "from-slate-400/15 to-slate-500/5 border-slate-400/30",
  "from-orange-400/15 to-orange-500/5 border-orange-400/30",
];

const SIZE_LABELS: Record<SizeVariant, string> = {
  small: "P 120g",
  medium: "M 140g",
  large: "G 160g",
};

export default function StrategyCard({ strategy, rank, isSelected, onSelect, onPreview, onSizeChange }: Props) {
  const RankIcon = RANK_ICONS[rank - 1] || Award;
  const rankColor = RANK_COLORS[rank - 1] || RANK_COLORS[2];

  return (
    <motion.div
      layout
      onClick={onSelect}
      className={`relative rounded-xl border p-3 cursor-pointer transition-all w-full max-w-full overflow-hidden ${
        isSelected
          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
          : `bg-gradient-to-br ${rankColor} hover:shadow-md`
      }`}
    >
      {/* Rank badge */}
      <div className="absolute -top-2 -left-1">
        <div className="flex items-center gap-1 bg-background border rounded-full px-2 py-0.5 shadow-sm">
          <RankIcon className="w-3 h-3 text-primary" />
          <span className="text-[9px] font-bold text-primary">#{rank}</span>
          <span className="text-[9px] text-muted-foreground font-mono">{strategy.score}pts</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mt-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{strategy.icon}</span>
          <div>
            <p className="text-xs font-bold">{strategy.name}</p>
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {strategy.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-[8px] px-1 py-0 h-4">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        {isSelected && (
          <div className="bg-primary rounded-full p-1">
            <Check className="w-3 h-3 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Rationale */}
      <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
        {strategy.rationale}
      </p>

      {/* Key factors */}
      <div className="flex flex-wrap gap-1 mb-2">
        {strategy.keyFactors.map((f, i) => (
          <span key={i} className="text-[9px] bg-muted/60 rounded px-1.5 py-0.5 text-muted-foreground">
            {f}
          </span>
        ))}
      </div>

      {/* Size variant selector */}
      <div className="flex items-center gap-1 mb-2">
        <span className="text-[9px] text-muted-foreground mr-1">Tamanho:</span>
        {(["small", "medium", "large"] as SizeVariant[]).map(size => {
          const variant = strategy.sizeVariants.find(v => v.size === size);
          const isActive = strategy.activeSize === size;
          return (
            <button
              key={size}
              onClick={(e) => { e.stopPropagation(); onSizeChange(size); }}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 text-muted-foreground border-transparent hover:border-primary/30"
              }`}
              title={variant?.description}
            >
              {SIZE_LABELS[size]}
            </button>
          );
        })}
      </div>

      {/* Macro summary */}
      <div className="grid grid-cols-4 gap-1 mb-2">
        <div className="text-center bg-background/60 rounded-lg p-1.5">
          <p className="text-[10px] font-bold text-primary">{strategy.macroProfile.calories}</p>
          <p className="text-[8px] text-muted-foreground">kcal</p>
        </div>
        <div className="text-center bg-background/60 rounded-lg p-1.5">
          <p className="text-[10px] font-bold text-red-500">{strategy.macroProfile.protein}g</p>
          <p className="text-[8px] text-muted-foreground">prot</p>
        </div>
        <div className="text-center bg-background/60 rounded-lg p-1.5">
          <p className="text-[10px] font-bold text-blue-500">{strategy.macroProfile.carbs}g</p>
          <p className="text-[8px] text-muted-foreground">carb</p>
        </div>
        <div className="text-center bg-background/60 rounded-lg p-1.5">
          <p className="text-[10px] font-bold text-amber-500">{strategy.macroProfile.fat}g</p>
          <p className="text-[8px] text-muted-foreground">gord</p>
        </div>
      </div>

      {/* Guardrail notes */}
      {strategy.guardrailNotes.length > 0 && (
        <div className="mb-2">
          {strategy.guardrailNotes.map((note, i) => (
            <p key={i} className="text-[8px] text-amber-600 dark:text-amber-400">⚠ {note}</p>
          ))}
        </div>
      )}

      {/* Macro percentages bar */}
      <div className="flex gap-1 mb-3">
        <div className="h-1.5 rounded-full bg-red-400/60" style={{ flex: strategy.macroProfile.protein * 4 }} />
        <div className="h-1.5 rounded-full bg-blue-400/60" style={{ flex: strategy.macroProfile.carbs * 4 }} />
        <div className="h-1.5 rounded-full bg-amber-400/60" style={{ flex: strategy.macroProfile.fat * 9 }} />
      </div>

      {/* Preview button */}
      <Button
        size="sm"
        variant={isSelected ? "default" : "outline"}
        className="w-full h-7 text-[10px] gap-1"
        onClick={(e) => { e.stopPropagation(); onPreview(); }}
      >
        <Eye className="w-3 h-3" />
        Ver Preview Completo
      </Button>
    </motion.div>
  );
}
