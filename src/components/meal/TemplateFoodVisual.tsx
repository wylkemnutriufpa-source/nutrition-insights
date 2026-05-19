import { useState, useMemo } from "react";
import { useMealVisualMatch } from "@/hooks/useMealVisualLibrary";
import { RecipeDetailModal } from "./RecipeDetailModal";
import { ChefHat } from "lucide-react";

interface TemplateFoodVisualProps {
  foodName: string;
  imageUrl?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: "w-8 h-8 rounded-md",
  md: "w-12 h-12 rounded-lg",
  lg: "w-16 h-16 rounded-xl",
};

export function TemplateFoodVisual({ foodName, imageUrl, className = "", size = "md" }: TemplateFoodVisualProps) {
  const match = useMealVisualMatch(foodName);
  const [recipeOpen, setRecipeOpen] = useState(false);

  const recipe = useMemo(() => {
    if (!match?.base_recipe) return null;
    try {
      return typeof match.base_recipe === "string"
        ? JSON.parse(match.base_recipe)
        : match.base_recipe;
    } catch {
      return null;
    }
  }, [match?.base_recipe]);

  const displayImageUrl = imageUrl || match?.image_url;
  if (!displayImageUrl) return null;

  const hasRecipe = !!recipe;
  const sizeClasses = SIZE_MAP[size];

  return (
    <>
      <button
        type="button"
        onClick={hasRecipe ? () => setRecipeOpen(true) : undefined}
        className={`relative group flex-shrink-0 ${hasRecipe ? "cursor-pointer" : "cursor-default"} ${className}`}
        title={hasRecipe ? `Ver receita: ${match.display_name}` : match.display_name}
      >
        <img
          src={displayImageUrl}
          alt={match.display_name || foodName}
          className={`${sizeClasses} object-cover shadow-sm border border-border/30 transition-transform group-hover:scale-105`}
          loading="lazy"
        />
        {hasRecipe && (
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-md border border-card">
            <ChefHat className="w-2.5 h-2.5 text-primary-foreground" />
          </span>
        )}
      </button>

      {hasRecipe && (
        <RecipeDetailModal
          open={recipeOpen}
          onOpenChange={setRecipeOpen}
          recipe={recipe}
          imageUrl={displayImageUrl}
          displayName={match.display_name}
        />
      )}
    </>
  );
}
