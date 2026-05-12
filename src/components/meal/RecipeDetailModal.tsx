import { Dialog, DialogContent } from "@v1/components/ui/dialog";
import { Badge } from "@v1/components/ui/badge";
import { Clock, ChefHat, Lightbulb, Utensils, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RecipeData {
  title: string;
  ingredients: string[];
  steps: string[];
  prep_time: string;
  difficulty: string;
  tips?: string;
}

interface RecipeDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: RecipeData | null;
  imageUrl?: string | null;
  displayName?: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  "fácil": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "média": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "difícil": "bg-red-500/20 text-red-400 border-red-500/30",
};

export function RecipeDetailModal({ open, onOpenChange, recipe, imageUrl, displayName }: RecipeDetailModalProps) {
  if (!recipe) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-xl rounded-2xl max-h-[90vh] flex flex-col">
        {/* Hero image */}
        {imageUrl && (
          <div className="relative w-full h-48 overflow-hidden flex-shrink-0">
            <img
              src={imageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="font-display text-xl font-bold text-foreground drop-shadow-lg">
                {recipe.title}
              </h2>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {!imageUrl && (
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{recipe.title}</h2>
              <button onClick={() => onOpenChange(false)} className="p-1 rounded-full hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1.5 text-xs bg-primary/10 text-primary border-primary/20">
              <Clock className="w-3 h-3" /> {recipe.prep_time}
            </Badge>
            <Badge variant="outline" className={`gap-1.5 text-xs ${DIFFICULTY_COLORS[recipe.difficulty] || "bg-muted text-muted-foreground"}`}>
              <ChefHat className="w-3 h-3" /> {recipe.difficulty}
            </Badge>
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Utensils className="w-4 h-4 text-primary" />
              Ingredientes
            </h3>
            <ul className="space-y-1.5">
              {recipe.ingredients.map((ing, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 flex-shrink-0" />
                  {ing}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <ChefHat className="w-4 h-4 text-primary" />
              Modo de Preparo
            </h3>
            <ol className="space-y-2">
              {recipe.steps.map((step, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className="flex gap-3 text-sm"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground pt-0.5">{step}</span>
                </motion.li>
              ))}
            </ol>
          </div>

          {/* Tips */}
          {recipe.tips && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
            >
              <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-300/90">{recipe.tips}</p>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
