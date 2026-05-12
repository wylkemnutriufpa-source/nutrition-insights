import { useEffect, useState } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent } from "@v1/components/ui/card";
import { Input } from "@v1/components/ui/input";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@v1/components/ui/dialog";
import { Label } from "@v1/components/ui/label";
import { motion } from "framer-motion";
import { Search, Apple, Flame, Beef, Wheat, Droplets, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
  is_custom?: boolean;
  nutritionist_id?: string | null;
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
  Personalizado: "bg-primary/10 text-primary",
  Outros: "bg-gray-500/10 text-gray-500",
};

const EMPTY_FOOD = {
  name: "", category: "Personalizado", calories: 0, protein: 0, carbs: 0, fat: 0,
  fiber: null as number | null, sodium: null as number | null, calcium: null as number | null, iron: null as number | null,
  serving_size: "100g",
};

export default function FoodDatabase() {
  const { user } = useAuth();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<typeof EMPTY_FOOD & { id?: string }>(EMPTY_FOOD);
  const [saving, setSaving] = useState(false);

  const loadFoods = () => {
    supabase.from("food_database").select("*").order("name").then(({ data }) => {
      setFoods((data as any[]) || []);
      const cats = [...new Set(((data as any[]) || []).map((f: any) => f.category))].sort();
      setCategories(cats);
    });
  };

  useEffect(() => { loadFoods(); }, []);

  const filtered = foods.filter(f => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || f.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const openCreate = () => {
    setEditingFood({ ...EMPTY_FOOD });
    setFormOpen(true);
  };

  const openEdit = (food: FoodItem) => {
    setEditingFood({
      id: food.id,
      name: food.name, category: food.category, calories: food.calories,
      protein: food.protein, carbs: food.carbs, fat: food.fat,
      fiber: food.fiber, sodium: food.sodium, calcium: food.calcium, iron: food.iron,
      serving_size: food.serving_size,
    });
    setFormOpen(true);
    setDetailOpen(false);
  };

  const handleSave = async () => {
    if (!editingFood.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!user) { toast.error("Faça login primeiro"); return; }
    setSaving(true);

    try {
      if (editingFood.id) {
        // Update
        const { error } = await supabase.from("food_database").update({
          name: editingFood.name,
          category: editingFood.category,
          calories: editingFood.calories,
          protein: editingFood.protein,
          carbs: editingFood.carbs,
          fat: editingFood.fat,
          fiber: editingFood.fiber,
          sodium: editingFood.sodium,
          calcium: editingFood.calcium,
          iron: editingFood.iron,
          serving_size: editingFood.serving_size,
        } as any).eq("id", editingFood.id);
        if (error) throw error;
        toast.success("Alimento atualizado!");
      } else {
        // Insert
        const { error } = await supabase.from("food_database").insert({
          name: editingFood.name,
          category: editingFood.category,
          calories: editingFood.calories,
          protein: editingFood.protein,
          carbs: editingFood.carbs,
          fat: editingFood.fat,
          fiber: editingFood.fiber,
          sodium: editingFood.sodium,
          calcium: editingFood.calcium,
          iron: editingFood.iron,
          serving_size: editingFood.serving_size,
          source: "Personalizado",
          is_custom: true,
          nutritionist_id: user.id,
        } as any);
        if (error) throw error;
        toast.success("Alimento criado!");
      }
      setFormOpen(false);
      loadFoods();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (food: FoodItem) => {
    if (!food.is_custom) { toast.error("Alimentos TACO não podem ser excluídos"); return; }
    const { error } = await supabase.from("food_database").delete().eq("id", food.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Alimento excluído");
    setDetailOpen(false);
    loadFoods();
  };

  const isOwner = (food: FoodItem) => food.is_custom && food.nutritionist_id === user?.id;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Apple className="w-6 h-6 text-primary" /> Tabela de Alimentos
            </h1>
            <p className="text-sm text-muted-foreground">{foods.length} alimentos • TACO + Personalizados</p>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Novo Alimento
          </Button>
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
                      <div className="flex items-center gap-1 mt-1">
                        <Badge className={`text-[10px] ${categoryColors[food.category] || "bg-muted text-muted-foreground"}`}>
                          {food.category}
                        </Badge>
                        {food.is_custom && <Badge variant="outline" className="text-[9px]">Custom</Badge>}
                      </div>
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
                <div className="flex items-center gap-2">
                  <Badge className={categoryColors[selected.category] || ""}>{selected.category}</Badge>
                  {selected.is_custom && <Badge variant="outline" className="text-xs">Personalizado</Badge>}
                </div>
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

                {isOwner(selected) && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button variant="outline" size="sm" onClick={() => openEdit(selected)} className="gap-1.5 flex-1">
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(selected)} className="gap-1.5 flex-1">
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create/Edit dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingFood.id ? "Editar Alimento" : "Novo Alimento Personalizado"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome *</Label>
                <Input value={editingFood.name} onChange={e => setEditingFood(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Whey Protein Isolado" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Categoria</Label><Input value={editingFood.category} onChange={e => setEditingFood(p => ({ ...p, category: e.target.value }))} /></div>
                <div><Label>Porção</Label><Input value={editingFood.serving_size} onChange={e => setEditingFood(p => ({ ...p, serving_size: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div><Label>Kcal</Label><Input type="number" value={editingFood.calories} onChange={e => setEditingFood(p => ({ ...p, calories: +e.target.value }))} /></div>
                <div><Label>Prot (g)</Label><Input type="number" value={editingFood.protein} onChange={e => setEditingFood(p => ({ ...p, protein: +e.target.value }))} /></div>
                <div><Label>Carb (g)</Label><Input type="number" value={editingFood.carbs} onChange={e => setEditingFood(p => ({ ...p, carbs: +e.target.value }))} /></div>
                <div><Label>Gord (g)</Label><Input type="number" value={editingFood.fat} onChange={e => setEditingFood(p => ({ ...p, fat: +e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div><Label>Fibra</Label><Input type="number" value={editingFood.fiber ?? ""} onChange={e => setEditingFood(p => ({ ...p, fiber: e.target.value ? +e.target.value : null }))} /></div>
                <div><Label>Sódio</Label><Input type="number" value={editingFood.sodium ?? ""} onChange={e => setEditingFood(p => ({ ...p, sodium: e.target.value ? +e.target.value : null }))} /></div>
                <div><Label>Cálcio</Label><Input type="number" value={editingFood.calcium ?? ""} onChange={e => setEditingFood(p => ({ ...p, calcium: e.target.value ? +e.target.value : null }))} /></div>
                <div><Label>Ferro</Label><Input type="number" value={editingFood.iron ?? ""} onChange={e => setEditingFood(p => ({ ...p, iron: e.target.value ? +e.target.value : null }))} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editingFood.id ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
