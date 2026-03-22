import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ChefHat, Plus, Pencil, Trash2, Clock, Users, Heart, Sparkles, Search, Share2 } from "lucide-react";
import { useAIUsage } from "@/hooks/useAIUsage";
import AIUsageBadge from "@/components/common/AIUsageBadge";
import PremiumRecipeModal from "@/components/recipe/PremiumRecipeModal";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: any;
  instructions: any;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  difficulty: string;
  category: string;
  calories_per_serving: number | null;
  protein_per_serving: number | null;
  carbs_per_serving: number | null;
  fat_per_serving: number | null;
  tags: string[];
  is_ai_generated: boolean;
  is_shared: boolean;
  created_at: string;
  is_favorited?: boolean;
}

const difficultyMap: Record<string, string> = { easy: "Fácil", medium: "Média", hard: "Difícil" };
const categoryMap: Record<string, string> = { main: "Prato Principal", snack: "Lanche", dessert: "Sobremesa", breakfast: "Café da Manhã", salad: "Salada", soup: "Sopa", drink: "Bebida" };

const emptyForm = {
  title: "", description: "", ingredients_text: "", instructions_text: "",
  prep_time_minutes: "15", cook_time_minutes: "30", servings: "2",
  difficulty: "medium", category: "main",
  calories_per_serving: "", protein_per_serving: "", carbs_per_serving: "", fat_per_serving: "",
};

// ──── NUTRITIONIST VIEW ────
function NutritionistRecipes() {
  const { user } = useAuth();
  const aiUsage = useAIUsage("generate_recipe");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const fetchRecipes = async () => {
    if (!user) return;
    const { data } = await supabase.from("recipes").select("*").eq("nutritionist_id", user.id).order("created_at", { ascending: false });
    setRecipes(data || []);
  };

  useEffect(() => { fetchRecipes(); }, [user]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (r: Recipe) => {
    setEditing(r);
    setForm({
      title: r.title, description: r.description || "",
      ingredients_text: (r.ingredients || []).join("\n"),
      instructions_text: (r.instructions || []).join("\n"),
      prep_time_minutes: String(r.prep_time_minutes), cook_time_minutes: String(r.cook_time_minutes),
      servings: String(r.servings), difficulty: r.difficulty, category: r.category,
      calories_per_serving: String(r.calories_per_serving || ""),
      protein_per_serving: String(r.protein_per_serving || ""),
      carbs_per_serving: String(r.carbs_per_serving || ""),
      fat_per_serving: String(r.fat_per_serving || ""),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.title.trim()) return;
    const payload = {
      nutritionist_id: user.id,
      title: form.title, description: form.description || null,
      ingredients: form.ingredients_text.split("\n").filter(Boolean),
      instructions: form.instructions_text.split("\n").filter(Boolean),
      prep_time_minutes: Number(form.prep_time_minutes) || 15,
      cook_time_minutes: Number(form.cook_time_minutes) || 30,
      servings: Number(form.servings) || 2,
      difficulty: form.difficulty, category: form.category,
      calories_per_serving: form.calories_per_serving ? Number(form.calories_per_serving) : null,
      protein_per_serving: form.protein_per_serving ? Number(form.protein_per_serving) : null,
      carbs_per_serving: form.carbs_per_serving ? Number(form.carbs_per_serving) : null,
      fat_per_serving: form.fat_per_serving ? Number(form.fat_per_serving) : null,
    };

    if (editing) {
      const { error } = await supabase.from("recipes").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message); else toast.success("Receita atualizada!");
    } else {
      const { error } = await supabase.from("recipes").insert(payload);
      if (error) toast.error(error.message); else toast.success("Receita criada!");
    }
    setDialogOpen(false); fetchRecipes();
  };

  const toggleShare = async (id: string, current: boolean) => {
    await supabase.from("recipes").update({ is_shared: !current }).eq("id", id);
    fetchRecipes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta receita?")) return;
    await supabase.from("recipes").delete().eq("id", id);
    toast.success("Receita removida!"); fetchRecipes();
  };

  const generateRecipe = async () => {
    if (!user || !aiPrompt.trim()) return;
    if (!aiUsage.allowed) {
      toast.error(aiUsage.nextAvailableLabel || "Limite de geração atingido");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recipe", {
        body: { prompt: aiPrompt, nutritionist_id: user.id },
      });
      if (error) throw error;
      toast.success("Receita gerada com IA! 🤖");
      await aiUsage.recordUsage();
      setAiDialogOpen(false); setAiPrompt(""); fetchRecipes();
    } catch (e: any) {
      toast.error("Erro ao gerar: " + (e.message || "Tente novamente"));
    }
    setGenerating(false);
  };

  const filtered = search
    ? recipes.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.category.includes(search.toLowerCase()))
    : recipes;

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-display text-2xl font-bold">Receitas</h1>
          <div className="flex items-center gap-2">
            <AIUsageBadge status={aiUsage} />
            <Button variant="outline" onClick={() => setAiDialogOpen(true)} disabled={!aiUsage.allowed} className="gap-2"><Sparkles className="w-4 h-4" /> Gerar com IA</Button>
            <Button onClick={openNew} className="gradient-primary gap-2"><Plus className="w-4 h-4" /> Nova Receita</Button>
          </div>
        </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar receitas..." className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(r => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass border-border h-full hover:border-primary/30 transition-colors cursor-pointer" onClick={() => { setSelected(r); setDetailOpen(true); }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-sm">{r.title}</h3>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{categoryMap[r.category] || r.category}</Badge>
                      <Badge variant="outline" className="text-[10px]">{difficultyMap[r.difficulty]}</Badge>
                      {r.is_ai_generated && <Badge className="text-[10px] bg-primary/10 text-primary">IA</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleShare(r.id, r.is_shared)}>
                      <Share2 className={`w-3.5 h-3.5 ${r.is_shared ? "text-primary" : ""}`} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{r.description}</p>
                <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.prep_time_minutes + r.cook_time_minutes}min</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{r.servings} porções</span>
                  {r.calories_per_serving && <span>{r.calories_per_serving} kcal</span>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recipe detail — Premium modal */}
      <PremiumRecipeModal recipe={selected} open={detailOpen} onOpenChange={setDetailOpen} />

      {/* Create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Editar Receita" : "Nova Receita"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Frango grelhado com quinoa" /></div>
            <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Breve descrição..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(categoryMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Dificuldade</Label>
                <Select value={form.difficulty} onValueChange={v => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(difficultyMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Preparo (min)</Label><Input type="number" value={form.prep_time_minutes} onChange={e => setForm({ ...form, prep_time_minutes: e.target.value })} /></div>
              <div><Label>Cozimento (min)</Label><Input type="number" value={form.cook_time_minutes} onChange={e => setForm({ ...form, cook_time_minutes: e.target.value })} /></div>
              <div><Label>Porções</Label><Input type="number" value={form.servings} onChange={e => setForm({ ...form, servings: e.target.value })} /></div>
            </div>
            <div><Label>Ingredientes (um por linha)</Label><Textarea value={form.ingredients_text} onChange={e => setForm({ ...form, ingredients_text: e.target.value })} rows={4} placeholder={"200g peito de frango\n1 xícara de quinoa\n..."} /></div>
            <div><Label>Modo de Preparo (um passo por linha)</Label><Textarea value={form.instructions_text} onChange={e => setForm({ ...form, instructions_text: e.target.value })} rows={4} placeholder={"Tempere o frango\nGrelhe em fogo médio\n..."} /></div>
            <div className="grid grid-cols-4 gap-2">
              <div><Label>Kcal/porção</Label><Input type="number" value={form.calories_per_serving} onChange={e => setForm({ ...form, calories_per_serving: e.target.value })} /></div>
              <div><Label>Prot (g)</Label><Input type="number" value={form.protein_per_serving} onChange={e => setForm({ ...form, protein_per_serving: e.target.value })} /></div>
              <div><Label>Carb (g)</Label><Input type="number" value={form.carbs_per_serving} onChange={e => setForm({ ...form, carbs_per_serving: e.target.value })} /></div>
              <div><Label>Gord (g)</Label><Input type="number" value={form.fat_per_serving} onChange={e => setForm({ ...form, fat_per_serving: e.target.value })} /></div>
            </div>
            <Button onClick={handleSave} className="w-full gradient-primary" disabled={!form.title.trim()}>{editing ? "Atualizar" : "Criar Receita"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generate dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Gerar Receita com IA</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Descreva a receita desejada</Label>
              <Textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={3} placeholder="Ex: Receita low carb com frango para almoço, fácil de fazer, até 30 minutos" />
            </div>
            <Button onClick={generateRecipe} className="w-full gradient-primary" disabled={!aiPrompt.trim() || generating}>
              {generating ? "Gerando..." : "Gerar Receita 🤖"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──── PATIENT VIEW ────
function PatientRecipes() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    if (!user) return;
    const { data: recs } = await supabase.from("recipes").select("*").eq("is_shared", true).order("created_at", { ascending: false });
    setRecipes(recs || []);
    const { data: favs } = await supabase.from("patient_favorite_recipes").select("recipe_id").eq("patient_id", user.id);
    setFavorites(new Set(favs?.map(f => f.recipe_id) || []));
  };

  useEffect(() => { fetchData(); }, [user]);

  const toggleFavorite = async (recipeId: string) => {
    if (!user) return;
    if (favorites.has(recipeId)) {
      await supabase.from("patient_favorite_recipes").delete().eq("patient_id", user.id).eq("recipe_id", recipeId);
    } else {
      await supabase.from("patient_favorite_recipes").insert({ patient_id: user.id, recipe_id: recipeId });
    }
    fetchData();
  };

  const filtered = search ? recipes.filter(r => r.title.toLowerCase().includes(search.toLowerCase())) : recipes;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold flex items-center gap-2"><ChefHat className="w-6 h-6 text-primary" /> Receitas</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar receitas..." className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(r => (
          <Card key={r.id} className="glass border-border hover:border-primary/30 transition-colors cursor-pointer" onClick={() => { setSelected(r); setDetailOpen(true); }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{r.title}</h3>
                  <div className="flex gap-1 mt-1"><Badge variant="outline" className="text-[10px]">{categoryMap[r.category] || r.category}</Badge></div>
                </div>
                <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); toggleFavorite(r.id); }}>
                  <Heart className={`w-4 h-4 ${favorites.has(r.id) ? "fill-destructive text-destructive" : ""}`} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{r.description}</p>
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                <span><Clock className="w-3 h-3 inline mr-1" />{r.prep_time_minutes + r.cook_time_minutes}min</span>
                {r.calories_per_serving && <span>{r.calories_per_serving} kcal</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{selected?.title}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{selected.description}</p>
              <div>
                <h4 className="font-medium text-sm mb-2">🥕 Ingredientes</h4>
                <ul className="space-y-1">{(selected.ingredients || []).map((ing: string, i: number) => <li key={i} className="text-sm flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" />{ing}</li>)}</ul>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">📝 Modo de Preparo</h4>
                <ol className="space-y-2">{(selected.instructions || []).map((s: string, i: number) => <li key={i} className="text-sm flex gap-2"><span className="font-bold text-primary">{i + 1}.</span>{s}</li>)}</ol>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Recipes() {
  const { isNutritionist } = useAuth();
  return <DashboardLayout>{isNutritionist ? <NutritionistRecipes /> : <PatientRecipes />}</DashboardLayout>;
}
