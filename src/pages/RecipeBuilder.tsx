import { useState, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat, Plus, Trash2, Camera, Save, Sparkles, Flame, Beef, Wheat, Droplets, ArrowLeft, Search, CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import IngredientSearch from "@/components/recipe/IngredientSearch";
import MacroGauge from "@/components/recipe/MacroGauge";
import MealSlotMatcher from "@/components/recipe/MealSlotMatcher";
import RecipeSearchDialog from "@/components/recipe/RecipeSearchDialog";
import {
  RecipeIngredient, calculateRecipeMacros, perServingMacros, getAvailableUnits,
} from "@/lib/recipeCalculator";
import { uploadFile } from "@/lib/upload";

export default function RecipeBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [servings, setServings] = useState(1);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [matcherOpen, setMatcherOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [savedDialogOpen, setSavedDialogOpen] = useState(false);

  const units = getAvailableUnits();

  // ── Macro calculation ──
  const totalMacros = useMemo(() => calculateRecipeMacros(ingredients), [ingredients]);
  const servingMacros = useMemo(() => perServingMacros(totalMacros, servings), [totalMacros, servings]);

  // ── Add ingredient from search ──
  const handleAddFood = (food: any) => {
    const newIng: RecipeIngredient = {
      id: crypto.randomUUID(),
      food_id: food.id,
      name: food.food_name,
      quantity_grams: food.portion_grams || 100,
      unit: "g",
      calories_per_gram: food.calories_per_gram || 0,
      protein_per_gram: food.protein_per_gram || 0,
      carbs_per_gram: food.carbs_per_gram || 0,
      fat_per_gram: food.fat_per_gram || 0,
    };
    setIngredients((prev) => [...prev, newIng]);
  };

  const updateIngredient = (id: string, field: keyof RecipeIngredient, value: any) => {
    setIngredients((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
    );
  };

  const removeIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((ing) => ing.id !== id));
  };

  // ── Image upload ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const path = await uploadFile({
        bucket: "meal-images",
        path: `${user.id}/recipes`,
        file,
        returnPath: true,
      });

      if (path) {
        setImagePath(path);
        const { data } = supabase.storage.from("meal-images").getPublicUrl(path);
        setImageUrl(data.publicUrl);
        toast.success("Foto adicionada! 📸");
      }
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    }
    setUploading(false);
  };

  // ── Save recipe ──
  const handleSave = async () => {
    if (!user || !title.trim() || ingredients.length === 0) {
      toast.error("Preencha o título e adicione pelo menos 1 ingrediente");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        instructions: instructions.trim() || null,
        ingredients_json: ingredients.map((ing) => ({
          food_id: ing.food_id,
          name: ing.name,
          quantity_grams: ing.quantity_grams,
          unit: ing.unit,
          calories_per_gram: ing.calories_per_gram,
          protein_per_gram: ing.protein_per_gram,
          carbs_per_gram: ing.carbs_per_gram,
          fat_per_gram: ing.fat_per_gram,
        })),
        image_url: imageUrl,
        image_path: imagePath,
        total_calories: Math.round(totalMacros.calories),
        total_protein: Math.round(totalMacros.protein * 10) / 10,
        total_carbs: Math.round(totalMacros.carbs * 10) / 10,
        total_fat: Math.round(totalMacros.fat * 10) / 10,
        servings,
      };

      const { error } = await supabase.from("user_recipes" as any).insert(payload);
      if (error) throw error;

      // Submit for curation if patient has a nutritionist
      const { data: link } = await supabase
        .from("nutritionist_patients")
        .select("nutritionist_id")
        .eq("patient_id", user.id)
        .eq("status", "active")
        .limit(1)
        .single();

      if (link) {
        // Get the just-created recipe
        const { data: recipe } = await supabase
          .from("user_recipes" as any)
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (recipe) {
          await supabase.from("recipe_curation_queue" as any).insert({
            recipe_id: (recipe as any).id,
            patient_id: user.id,
            nutritionist_id: (link as any).nutritionist_id,
          });
        }
      }

      toast.success("Receita salva! 🎉");
      setSavedDialogOpen(true);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
    setSaving(false);
  };

  // ── Load existing recipe into builder ──
  const handleLoadRecipe = (r: {
    title: string;
    description: string;
    instructions: string;
    servings: number;
    ingredients: RecipeIngredient[];
    imageUrl: string | null;
    imagePath: string | null;
  }) => {
    setTitle(r.title);
    setDescription(r.description);
    setInstructions(r.instructions);
    setServings(r.servings);
    setIngredients(r.ingredients);
    setImageUrl(r.imageUrl);
    setImagePath(r.imagePath);
    toast.success(`Receita "${r.title}" carregada — agora você pode fazer o Match Clínico.`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/recipes")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" /> Calculadora de Receitas
            </h1>
            <p className="text-xs text-muted-foreground">Monte sua receita e veja os macros em tempo real</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)} className="gap-1.5 shrink-0">
            <Search className="w-4 h-4" /> <span className="hidden sm:inline">Buscar Receita</span>
          </Button>
        </div>

        {/* ── MACRO GAUGES ── */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <MacroGauge label="Calorias" value={servingMacros.calories} unit="kcal" color="orange-500" icon={<Flame className="w-4 h-4 text-orange-500" />} />
              <MacroGauge label="Proteína" value={servingMacros.protein} unit="g" color="red-500" icon={<Beef className="w-4 h-4 text-red-500" />} />
              <MacroGauge label="Carboidrato" value={servingMacros.carbs} unit="g" color="amber-500" icon={<Wheat className="w-4 h-4 text-amber-500" />} />
              <MacroGauge label="Gordura" value={servingMacros.fat} unit="g" color="blue-500" icon={<Droplets className="w-4 h-4 text-blue-500" />} />
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              {servings > 1 ? `por porção (${servings} porções · total: ${Math.round(totalMacros.calories)} kcal)` : "total da receita"}
            </p>
          </CardContent>
        </Card>

        {/* ── RECIPE INFO ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display">Informações da Receita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Nome da receita *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Minha Panqueca Top" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Porções</Label>
                <Input type="number" min={1} value={servings} onChange={(e) => setServings(Math.max(1, Number(e.target.value)))} />
              </div>
              <div>
                <Label>Foto</Label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <Button variant="outline" className="w-full gap-2" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Camera className="w-4 h-4" /> {uploading ? "Enviando..." : imageUrl ? "Trocar foto" : "Adicionar foto"}
                </Button>
              </div>
            </div>
            {imageUrl && (
              <img src={imageUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
            )}
          </CardContent>
        </Card>

        {/* ── INGREDIENTS ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              🥕 Ingredientes ({ingredients.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <IngredientSearch onSelect={handleAddFood} />

            <AnimatePresence>
              {ingredients.map((ing) => (
                <motion.div
                  key={ing.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ing.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {Math.round(ing.quantity_grams * (ing.calories_per_gram || 0) * (ing.unit === "g" ? 1 : 15))} kcal
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    value={ing.quantity_grams}
                    onChange={(e) => updateIngredient(ing.id, "quantity_grams", Number(e.target.value))}
                    className="w-20 h-8 text-sm text-center"
                  />
                  <Select value={ing.unit} onValueChange={(v) => updateIngredient(ing.id, "unit", v)}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeIngredient(ing.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>

            {ingredients.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Digite acima para buscar e adicionar ingredientes
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── INSTRUCTIONS ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display">📝 Modo de Preparo</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={5}
              placeholder={"1. Misture a aveia com o ovo\n2. Aqueça a frigideira\n3. Despeje a massa e espere dourar\n..."}
            />
          </CardContent>
        </Card>

        {/* ── ACTIONS ── */}
        <div className="flex gap-3">
          <Button onClick={handleSave} className="flex-1 gradient-primary gap-2" disabled={saving || !title.trim() || ingredients.length === 0}>
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Receita"}
          </Button>
          {ingredients.length > 0 && (
            <Button variant="outline" onClick={() => setMatcherOpen(true)} className="gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Match Clínico
            </Button>
          )}
        </div>

        {/* ── MEAL SLOT MATCHER ── */}
        <MealSlotMatcher
          open={matcherOpen}
          onOpenChange={setMatcherOpen}
          ingredients={ingredients}
          servings={servings}
          recipeName={title || "Receita"}
        />

        {/* ── SEARCH SAVED RECIPES ── */}
        <RecipeSearchDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onLoad={handleLoadRecipe}
        />

        {/* ── POST-SAVE CONFIRMATION ── */}
        <Dialog open={savedDialogOpen} onOpenChange={setSavedDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Receita salva com sucesso!
              </DialogTitle>
              <DialogDescription>
                Seu nutricionista será notificado para revisar e aprovar.
                Quer fazer o <strong>Match Clínico</strong> agora — ajustar as porções para encaixar em uma refeição do seu plano?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSavedDialogOpen(false);
                  navigate("/recipes");
                }}
              >
                Voltar para Receitas
              </Button>
              <Button
                className="flex-1 gradient-primary gap-2"
                onClick={() => {
                  setSavedDialogOpen(false);
                  setMatcherOpen(true);
                }}
              >
                <Sparkles className="w-4 h-4" /> Fazer Match Clínico
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
