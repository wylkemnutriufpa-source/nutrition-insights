import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Search, Loader2, Coffee, Apple, Utensils, Moon, Cherry,
  Flame, Beef, Wheat, Droplets, GripVertical,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────
interface VisualItem {
  id: string;
  name: string;
  display_name: string;
  category: string;
  subcategory: string | null;
  image_url: string | null;
  default_portion: string | null;
  default_calories: number | null;
  default_protein: number | null;
  default_carbs: number | null;
  default_fat: number | null;
  tags: string[] | null;
}

interface MealVisualLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDragStartFromLibrary?: () => void;
}

// ── Category tabs ───────────────────────────────────────────
const CATEGORIES = [
  { key: "cafe_da_manha", label: "Café", icon: <Coffee className="w-4 h-4" /> },
  { key: "lanche", label: "Lanches", icon: <Apple className="w-4 h-4" /> },
  { key: "almoco", label: "Almoço", icon: <Utensils className="w-4 h-4" /> },
  { key: "jantar", label: "Jantar", icon: <Moon className="w-4 h-4" /> },
  { key: "frutas", label: "Frutas", icon: <Cherry className="w-4 h-4" /> },
];

// ── Component ───────────────────────────────────────────────
export function MealVisualLibraryModal({ open, onOpenChange, onDragStartFromLibrary }: MealVisualLibraryModalProps) {
  const [items, setItems] = useState<VisualItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("cafe_da_manha");

  // Fetch all active items once
  useEffect(() => {
    if (!open) return;
    if (items.length > 0) return;
    setLoading(true);
    supabase
      .from("meal_visual_library" as any)
      .select("id, name, display_name, category, subcategory, image_url, default_portion, default_calories, default_protein, default_carbs, default_fat, tags")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }: any) => {
        setItems((data || []) as VisualItem[]);
        setLoading(false);
      });
  }, [open, items.length]);

  // Filter
  const filtered = useMemo(() => {
    let list = items.filter((i) => {
      if (activeCategory === "frutas") {
        return i.category === "frutas" || i.subcategory === "frutas" || i.tags?.includes("fruta");
      }
      return i.category === activeCategory;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.display_name.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, activeCategory, search]);

  // Drag start handler
  const handleDragStart = (e: React.DragEvent, item: VisualItem) => {
    const payload = {
      source: "visual_library",
      id: item.id,
      title: item.display_name,
      name: item.name,
      image_url: item.image_url,
      calories: item.default_calories,
      protein: item.default_protein,
      carbs: item.default_carbs,
      fat: item.default_fat,
      portion: item.default_portion,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
    // Close modal so user can see the canvas drop zones
    setTimeout(() => {
      onOpenChange(false);
      onDragStartFromLibrary?.();
    }, 50);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Utensils className="w-4 h-4 text-primary" />
            Banco de Refeições
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Arraste uma refeição e solte no slot desejado do plano alimentar.
          </DialogDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar refeição…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </DialogHeader>

        {/* Category tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 pb-2 border-b border-border overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeCategory === cat.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="flex-1 px-5 py-4 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              <Utensils className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhuma refeição encontrada</p>
              <p className="text-[10px] mt-1">Tente outro filtro ou categoria</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((item) => (
                <MealVisualCard key={item.id} item={item} onDragStart={handleDragStart} />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ── Card ────────────────────────────────────────────────────
function MealVisualCard({ item, onDragStart }: {
  item: VisualItem;
  onDragStart: (e: React.DragEvent, item: VisualItem) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      className="rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.display_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Utensils className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-background/80 backdrop-blur-sm rounded p-0.5">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="text-xs font-medium leading-tight truncate">{item.display_name}</p>
        {item.default_portion && (
          <p className="text-[9px] text-muted-foreground mt-0.5">{item.default_portion}</p>
        )}
        {/* Macros */}
        <div className="flex items-center gap-2 mt-1.5 text-[9px]">
          {item.default_calories != null && (
            <span className="flex items-center gap-0.5 font-semibold">
              <Flame className="w-2.5 h-2.5 text-orange-400" /> {item.default_calories}
            </span>
          )}
          {item.default_protein != null && (
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <Beef className="w-2.5 h-2.5 text-red-400" /> {item.default_protein}g
            </span>
          )}
          {item.default_carbs != null && (
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <Wheat className="w-2.5 h-2.5 text-amber-500" /> {item.default_carbs}g
            </span>
          )}
          {item.default_fat != null && (
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <Droplets className="w-2.5 h-2.5 text-blue-400" /> {item.default_fat}g
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
