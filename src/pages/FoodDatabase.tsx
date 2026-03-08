import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Search, Apple, Flame, Beef, Wheat, Droplets } from "lucide-react";

interface FoodItem {
  id: string;
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sodium: number | null;
  calcium: number | null;
  iron: number | null;
  serving_size: string;
  source: string;
}

const categoryColors: Record<string, string> = {
  Cereais: "bg-amber-500/10 text-amber-500",
  Leguminosas: "bg-green-500/10 text-green-500",
  Carnes: "bg-red-500/10 text-red-500",
  Ovos: "bg-yellow-500/10 text-yellow-500",
  "Laticínios": "bg-blue-500/10 text-blue-500",
  Frutas: "bg-pink-500/10 text-pink-500",
  Verduras: "bg-emerald-500/10 text-emerald-500",
  "Tubérculos": "bg-orange-500/10 text-orange-500",
  Peixes: "bg-cyan-500/10 text-cyan-500",
  "Óleos": "bg-yellow-600/10 text-yellow-600",
  Oleaginosas: "bg-amber-600/10 text-amber-600",
  Suplementos: "bg-purple-500/10 text-purple-500",
  Outros: "bg-gray-500/10 text-gray-500",
};

export default function FoodDatabase() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    supabase.from("food_database").select("*").order("name").then(({ data }) => {
      setFoods(data || []);
      const cats = [...new Set((data || []).map(f => f.category))].sort();
      setCategories(cats);
    });
  }, []);

  const filtered = foods.filter(f => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || f.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Apple className="w-6 h-6 text-primary" /> Tabela de Alimentos (TACO)
          </h1>
          <p className="text-sm text-muted-foreground">{foods.length} alimentos cadastrados • Fonte: Tabela Brasileira de Composição de Alimentos</p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar alimento..." className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(food => (
            <motion.div key={food.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card
                className="glass border-border hover:border-primary/30 transition-colors cursor-pointer h-full"
                onClick={() => { setSelected(food); setDetailOpen(true); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-sm">{food.name}</h3>
                      <Badge className={`text-[10px] mt-1 ${categoryColors[food.category] || "bg-muted text-muted-foreground"}`}>
                        {food.category}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-primary">{food.calories}</span>
                      <span className="text-xs text-muted-foreground block">kcal</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center p-1.5 rounded bg-red-500/5">
                      <span className="text-xs font-bold">{food.protein}g</span>
                      <span className="text-[10px] text-muted-foreground block">Prot</span>
                    </div>
                    <div className="text-center p-1.5 rounded bg-amber-500/5">
                      <span className="text-xs font-bold">{food.carbs}g</span>
                      <span className="text-[10px] text-muted-foreground block">Carb</span>
                    </div>
                    <div className="text-center p-1.5 rounded bg-yellow-500/5">
                      <span className="text-xs font-bold">{food.fat}g</span>
                      <span className="text-[10px] text-muted-foreground block">Gord</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-2 block">por {food.serving_size}</span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <Card className="glass"><CardContent className="py-12 text-center">
            <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum alimento encontrado.</p>
          </CardContent></Card>
        )}

        {/* Detail dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">{selected?.name}</DialogTitle></DialogHeader>
            {selected && (
              <div className="space-y-4">
                <Badge className={categoryColors[selected.category] || ""}>{selected.category}</Badge>
                <p className="text-xs text-muted-foreground">Valores por {selected.serving_size} • Fonte: {selected.source}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                    <Flame className="w-5 h-5 mx-auto text-primary mb-1" />
                    <span className="text-2xl font-bold">{selected.calories}</span>
                    <span className="text-xs text-muted-foreground block">kcal</span>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                    <Beef className="w-5 h-5 mx-auto text-red-500 mb-1" />
                    <span className="text-2xl font-bold">{selected.protein}g</span>
                    <span className="text-xs text-muted-foreground block">Proteína</span>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                    <Wheat className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                    <span className="text-2xl font-bold">{selected.carbs}g</span>
                    <span className="text-xs text-muted-foreground block">Carboidratos</span>
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                    <Droplets className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
                    <span className="text-2xl font-bold">{selected.fat}g</span>
                    <span className="text-xs text-muted-foreground block">Gorduras</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Micronutrientes</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selected.fiber != null && <div className="flex justify-between p-2 rounded bg-muted"><span>Fibra</span><span className="font-medium">{selected.fiber}g</span></div>}
                    {selected.sodium != null && <div className="flex justify-between p-2 rounded bg-muted"><span>Sódio</span><span className="font-medium">{selected.sodium}mg</span></div>}
                    {selected.calcium != null && <div className="flex justify-between p-2 rounded bg-muted"><span>Cálcio</span><span className="font-medium">{selected.calcium}mg</span></div>}
                    {selected.iron != null && <div className="flex justify-between p-2 rounded bg-muted"><span>Ferro</span><span className="font-medium">{selected.iron}mg</span></div>}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
