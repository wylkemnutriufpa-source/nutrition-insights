import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ChefHat, Plus, Pencil, Trash2, Clock, Users, Heart, Sparkles, Search, Share2, Calculator } from "lucide-react";
import { useAIUsage } from "@/hooks/useAIUsage";
import { useFeatureFlag } from "@/lib/featureFlags";
import AIUsageBadge from "@/components/common/AIUsageBadge";
import PremiumRecipeModal from "@/components/recipe/PremiumRecipeModal";
import EmptyState from "@/components/common/EmptyState";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: any;
  instructions: any;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  difficulty: string | null;
  category: string | null;
  calories_per_serving: number | null;
  protein_per_serving: number | null;
  carbs_per_serving: number | null;
  fat_per_serving: number | null;
  tags: string[] | null;
  is_ai_generated: boolean | null;
  is_shared: boolean | null;
  created_at: string;
}

function formatIngredient(item: any): string {
  if (!item) return "";
  if (typeof item === "string") return item;
  if (typeof item === "object") {
    const name = item.item || item.name || item.ingredient || "";
    const amount = item.amount || item.quantity || item.qty || "";
    const unit = item.unit || "";
    if (!name) return JSON.stringify(item);
    const parts = [name];
    if (amount || unit) parts.push("—");
    if (amount) parts.push(String(amount));
    if (unit) parts.push(String(unit));
    return parts.join(" ").trim();
  }
  return String(item);
}

function toStringArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((v) => {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") return v.step || v.text || v.description || formatIngredient(v);
    return String(v);
  }).filter(Boolean);
  if (typeof val === "string") return val.split("\n").filter(Boolean);
  return [];
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
  const { enabled: llmEnabled } = useFeatureFlag("llm_global_enabled");
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
    try {
      const { data, error } = await supabase.from("recipes").select("*").eq("nutritionist_id", user.id).order("created_at", { ascending: false });
      if (error) { console.error("[Recipes] fetch error:", error); }
      setRecipes(data || []);
    } catch (e) { console.error("[Recipes] unexpected error:", e); }
  };

  useEffect(() => { fetchRecipes(); }, [user]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (r: Recipe) => {
    setEditing(r);
    setForm({
      title: r.title, description: r.description || "",
      ingredients_text: toStringArray(r.ingredients).join("\n"),
      instructions_text: toStringArray(r.instructions).join("\n"),
      prep_time_minutes: String(r.prep_time_minutes ?? 15), cook_time_minutes: String(r.cook_time_minutes ?? 30),
      servings: String(r.servings ?? 2), difficulty: r.difficulty ?? "medium", category: r.category ?? "main",
      calories_per_serving: String(r.calories_per_serving ?? ""),
      protein_per_serving: String(r.protein_per_serving ?? ""),
      carbs_per_serving: String(r.carbs_per_serving ?? ""),
      fat_per_serving: String(r.fat_per_serving ?? ""),
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

  const toggleShare = async (id: string, current: boolean | null) => {
    await supabase.from("recipes").update({ is_shared: !(current ?? false) }).eq("id", id);
    fetchRecipes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta receita?")) return;
    await supabase.from("recipes").delete().eq("id", id);
    toast.success("Receita removida!"); fetchRecipes();
  };

  const generateRecipe = async () => {
    if (!user || !aiPrompt.trim()) return;
    if (!llmEnabled) {
      toast.error("IA LLM desativada pelo administrador");
      return;
    }
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
    ? recipes.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || (r.category ?? "").includes(search.toLowerCase()))
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

      {filtered.length === 0 ? (
        <EmptyState icon={ChefHat} title="Nenhuma receita" description="Crie sua primeira receita ou gere com IA." actionLabel="Nova Receita" onAction={openNew} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass border-border h-full hover:border-primary/30 transition-colors cursor-pointer" onClick={() => { setSelected(r); setDetailOpen(true); }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-sm">{r.title}</h3>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{categoryMap[r.category ?? "main"] || r.category}</Badge>
                        <Badge variant="outline" className="text-[10px]">{difficultyMap[r.difficulty ?? "medium"] || r.difficulty}</Badge>
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
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{(r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0)}min</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{r.servings ?? 1} porções</span>
                    {r.calories_per_serving && <span>{r.calories_per_serving} kcal</span>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

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
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: recs, error: recErr } = await supabase.from("recipes").select("*").eq("is_shared", true).order("created_at", { ascending: false });
      if (recErr) throw recErr;
      setRecipes(recs || []);

      const { data: favs } = await supabase.from("patient_favorite_recipes").select("recipe_id").eq("patient_id", user.id);
      setFavorites(new Set(favs?.map(f => f.recipe_id) || []));
    } catch (e: any) {
      console.error("[PatientRecipes] error:", e);
      setError(e.message || "Erro ao carregar receitas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const toggleFavorite = async (recipeId: string) => {
    if (!user) return;
    try {
      if (favorites.has(recipeId)) {
        await supabase.from("patient_favorite_recipes").delete().eq("patient_id", user.id).eq("recipe_id", recipeId);
      } else {
        await supabase.from("patient_favorite_recipes").insert({ patient_id: user.id, recipe_id: recipeId });
      }
      fetchData();
    } catch (e) { console.error("[PatientRecipes] toggle favorite error:", e); }
  };

  const filtered = search ? recipes.filter(r => r.title.toLowerCase().includes(search.toLowerCase())) : recipes;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><ChefHat className="w-6 h-6 text-primary" /> Receitas</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="glass border-border"><CardContent className="p-4 h-32 animate-pulse bg-muted/30 rounded-lg" /></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><ChefHat className="w-6 h-6 text-primary" /> Receitas</h1>
        <EmptyState icon={ChefHat} title="Erro ao carregar" description={error} actionLabel="Tentar novamente" onAction={fetchData} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><ChefHat className="w-6 h-6 text-primary" /> Receitas</h1>
        <Button onClick={() => navigate("/v1/recipe-builder")} className="gradient-primary gap-2">
          <Calculator className="w-4 h-4" /> Criar Receita
        </Button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar receitas..." className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ChefHat} title="Nenhuma receita disponível" description="Seu nutricionista ainda não compartilhou receitas." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(r => (
            <Card key={r.id} className="glass border-border hover:border-primary/30 transition-colors cursor-pointer" onClick={() => { setSelected(r); setDetailOpen(true); }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{r.title}</h3>
                    <div className="flex gap-1 mt-1"><Badge variant="outline" className="text-[10px]">{categoryMap[r.category ?? "main"] || r.category}</Badge></div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); toggleFavorite(r.id); }}>
                    <Heart className={`w-4 h-4 ${favorites.has(r.id) ? "fill-destructive text-destructive" : ""}`} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{r.description}</p>
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span><Clock className="w-3 h-3 inline mr-1" />{(r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0)}min</span>
                  {r.calories_per_serving && <span>{r.calories_per_serving} kcal</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PremiumRecipeModal recipe={selected} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}

export default function Recipes() {
  const { isNutritionist } = useAuth();
  return <DashboardLayout>{isNutritionist ? <NutritionistRecipes /> : <PatientRecipes />}</DashboardLayout>;
}
