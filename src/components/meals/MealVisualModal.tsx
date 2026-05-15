import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Flame, Beef, Wheat, Droplets, UtensilsCrossed, ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import MealVisualPlaceholder from "./MealVisualPlaceholder";
import type { MealVisualItem } from "@/types/mealVisualLibrary";
import { MEAL_VISUAL_CATEGORIES } from "@/types/mealVisualLibrary";

interface MealVisualModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MealVisualItem | null;
  planOverrides?: {
    title?: string;
    description?: string | null;
    meta_calorias?: number | null;
    meta_proteinas?: number | null;
    meta_carboidratos?: number | null;
    meta_gorduras?: number | null;
    image_url?: string | null;
  };
}

export default function MealVisualModal({ open, onOpenChange, item, planOverrides }: MealVisualModalProps) {
  const [galleryIndex, setGalleryIndex] = useState(0);

  if (!item) return null;

  const title = planOverrides?.title || item.display_name;
  const description = planOverrides?.description || item.short_description;
  const calories = planOverrides?.meta_calorias ?? item.default_calories;
  const protein = planOverrides?.meta_proteinas ?? item.default_protein;
  const carbs = planOverrides?.meta_carboidratos ?? item.default_carbs;
  const fat = planOverrides?.meta_gorduras ?? item.default_fat;
  const primaryImage = planOverrides?.image_url || item.image_url || item.image_path;
  const allImages = [primaryImage, ...(item.gallery_images || [])].filter(Boolean) as string[];
  const currentImage = allImages[galleryIndex] || primaryImage;
  const cat = MEAL_VISUAL_CATEGORIES[item.category];
  const hasMacros = calories || protein || carbs || fat;
  const hasGallery = allImages.length > 1;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setGalleryIndex(0); }}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden rounded-2xl border-border/50 shadow-2xl backdrop-blur-sm">
        {/* Hero */}
        {currentImage ? (
          <div className="relative w-full h-48 overflow-hidden">
            <img src={currentImage} alt={title} className="w-full h-full object-cover transition-all duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

            {/* Gallery navigation */}
            {hasGallery && (
              <>
                <button
                  onClick={() => setGalleryIndex((i) => (i - 1 + allImages.length) % allImages.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center hover:bg-background/80 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGalleryIndex((i) => (i + 1) % allImages.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center hover:bg-background/80 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {/* Dots */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {allImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setGalleryIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${idx === galleryIndex ? "bg-primary scale-125" : "bg-white/50"}`}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/10">
                  <UtensilsCrossed className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white drop-shadow-lg">{title}</h3>
                  {cat && <p className="text-xs text-white/70 drop-shadow">{cat.emoji} {cat.label}</p>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-3">
                <MealVisualPlaceholder size="sm" />
                <div>
                  <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    {cat ? `${cat.emoji} ${cat.label}` : "Detalhes da refeição"}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-6 pt-3">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">{tag}</Badge>
            ))}
            {item.default_portion && <Badge variant="outline" className="text-[10px]">{item.default_portion}</Badge>}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-8 space-y-5 max-h-[calc(90vh-200px)]">
          {hasMacros && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Calorias", value: calories, unit: "", icon: <Flame className="w-5 h-5 text-orange-500" /> },
                { label: "Proteína", value: protein, unit: "g", icon: <Beef className="w-5 h-5 text-red-500" /> },
                { label: "Carbs", value: carbs, unit: "g", icon: <Wheat className="w-5 h-5 text-amber-500" /> },
                { label: "Gordura", value: fat, unit: "g", icon: <Droplets className="w-5 h-5 text-yellow-500" /> },
              ].map((m) => (
                <div key={m.label} className="rounded-xl bg-secondary/60 p-3 text-center">
                  <div className="flex justify-center mb-1.5">{m.icon}</div>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  <p className="font-bold text-base">{m.value != null ? `${Number(m.value).toFixed(0)}${m.unit}` : "—"}</p>
                </div>
              ))}
            </div>
          )}

          {description && <p className="text-sm text-muted-foreground">{description}</p>}

          {/* Gallery thumbnails */}
          {hasGallery && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setGalleryIndex(idx)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    idx === galleryIndex ? "border-primary shadow-glow" : "border-border/30 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={url} alt={`${title} ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {item.base_recipe && (
            <>
              <Separator />
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ScrollText className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold text-base">Receita / Preparo</h4>
                </div>
                <div className="rounded-lg bg-secondary/30 p-4">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{item.base_recipe}</p>
                </div>
              </section>
            </>
          )}

          {!hasMacros && !description && !item.base_recipe && (
            <div className="text-center py-10 text-muted-foreground">
              <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Informações detalhadas em breve.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
