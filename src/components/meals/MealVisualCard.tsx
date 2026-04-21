import { motion } from "framer-motion";
import { Flame, Beef } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MealVisualPlaceholder from "./MealVisualPlaceholder";
import type { MealVisualItem } from "@/types/mealVisualLibrary";
import { MEAL_VISUAL_CATEGORIES } from "@/types/mealVisualLibrary";
import { fmtMacro } from "@/lib/formatMacros";

interface MealVisualCardProps {
  item: MealVisualItem;
  onClick?: () => void;
  compact?: boolean;
  /** Override image URL (e.g. from meal_plan_items.image_url) */
  imageOverride?: string | null;
}

export default function MealVisualCard({ item, onClick, compact, imageOverride }: MealVisualCardProps) {
  const imgSrc = imageOverride || item.image_url || item.image_path;
  const cat = MEAL_VISUAL_CATEGORIES[item.category];

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer ${
        compact ? "" : ""
      }`}
    >
      {/* Image area */}
      <div className={`relative overflow-hidden ${compact ? "h-20" : "h-28"}`}>
        {imgSrc ? (
          <>
            <img
              src={imgSrc}
              alt={item.display_name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          </>
        ) : (
          <MealVisualPlaceholder size="lg" className="h-full w-full rounded-none" />
        )}

        {/* Category badge */}
        {cat && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-[9px] bg-background/70 backdrop-blur-sm border-border/30">
              {cat.emoji} {cat.label}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`${compact ? "px-2 py-1.5" : "px-3 py-2.5"}`}>
        <h4 className={`font-semibold leading-tight truncate ${compact ? "text-xs" : "text-sm"}`}>
          {item.display_name}
        </h4>
        {!compact && item.short_description && (
          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
            {item.short_description}
          </p>
        )}

        {/* Macros */}
        {(item.default_calories || item.default_protein) && (
          <div className="flex items-center gap-2 mt-1.5 text-[9px] text-muted-foreground">
            {item.default_calories != null && (
              <span className="flex items-center gap-0.5">
                <Flame className="w-2.5 h-2.5 text-orange-400" />
                {fmtMacro(item.default_calories)}kcal
              </span>
            )}
            {item.default_protein != null && (
              <span className="flex items-center gap-0.5">
                <Beef className="w-2.5 h-2.5 text-red-400" />
                {fmtMacro(item.default_protein)}g
              </span>
            )}
            {item.default_portion && (
              <span className="text-muted-foreground/60">{item.default_portion}</span>
            )}
          </div>
        )}

        {/* Tags */}
        {!compact && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/5 text-primary/70 border border-primary/10"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
