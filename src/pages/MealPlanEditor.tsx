import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, Copy, GripVertical, Utensils,
  Sun, Coffee, Apple, Sandwich, Moon, Cookie, Save, ChevronLeft, ChevronRight,
  Flame, Beef, Wheat, Droplets, Leaf, PencilLine, X, Check, Sparkles, Loader2,
  Bookmark, BookmarkCheck, FolderDown, FolderUp, BookOpen
} from "lucide-react";
import PlanScheduler from "@/components/plans/PlanScheduler";
import DocumentUpload from "@/components/common/DocumentUpload";
import FoodAutocomplete, { type FoodItem } from "@/components/meals/FoodAutocomplete";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type MealPlan = Tables<"meal_plans">;
type MealPlanItem = Tables<"meal_plan_items">;
type MealType = Database["public"]["Enums"]["meal_type"];

const MEAL_TYPES: { key: MealType; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "breakfast", label: "Café da Manhã", icon: <Coffee className="w-4 h-4" />, color: "text-amber-500" },
  { key: "morning_snack", label: "Lanche da Manhã", icon: <Apple className="w-4 h-4" />, color: "text-green-500" },
  { key: "lunch", label: "Almoço", icon: <Utensils className="w-4 h-4" />, color: "text-orange-500" },
  { key: "afternoon_snack", label: "Lanche da Tarde", icon: <Cookie className="w-4 h-4" />, color: "text-pink-500" },
  { key: "dinner", label: "Jantar", icon: <Moon className="w-4 h-4" />, color: "text-indigo-500" },
  { key: "evening_snack", label: "Ceia", icon: <Sun className="w-4 h-4" />, color: "text-purple-500" },
];

const DAYS = [
  { key: 0, label: "Domingo", short: "Dom" },
  { key: 1, label: "Segunda", short: "Seg" },
  { key: 2, label: "Terça", short: "Ter" },
  { key: 3, label: "Quarta", short: "Qua" },
  { key: 4, label: "Quinta", short: "Qui" },
  { key: 5, label: "Sexta", short: "Sex" },
  { key: 6, label: "Sábado", short: "Sáb" },
];

interface ItemForm {
  title: string;
  description: string;
  calories_target: string;
  protein_target: string;
  carbs_target: string;
  fat_target: string;
}

const emptyForm: ItemForm = {
  title: "",
  description: "",
  calories_target: "",
  protein_target: "",
  carbs_target: "",
  fat_target: "",
};

export default function MealPlanEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [patientName, setPatientName] = useState("");
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [planDocs, setPlanDocs] = useState<any[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MealPlanItem | null>(null);
  const [dialogMealType, setDialogMealType] = useState<MealType>("breakfast");
  const [dialogDay, setDialogDay] = useState<number>(1);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Copy state
  const [copySource, setCopySource] = useState<{ day: number; mealType: MealType } | null>(null);
  const [generating, setGenerating] = useState(false);

  // Save/Import state
  const [savingMeal, setSavingMeal] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savedMealsDialogOpen, setSavedMealsDialogOpen] = useState(false);
  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [loadingSavedMeals, setLoadingSavedMeals] = useState(false);
  const [savedPlansDialogOpen, setSavedPlansDialogOpen] = useState(false);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [loadingSavedPlans, setLoadingSavedPlans] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);

    const [{ data: planData }, { data: itemsData }] = await Promise.all([
      supabase.from("meal_plans").select("*").eq("id", id).single(),
      supabase.from("meal_plan_items").select("*").eq("meal_plan_id", id).order("created_at"),
    ]);

    if (planData) {
      setPlan(planData);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", planData.patient_id)
        .single();
      setPatientName(profile?.full_name || "Paciente");
    }
    setItems(itemsData || []);

    // Fetch documents
    const { data: docs } = await supabase
      .from("patient_documents" as any)
      .select("*")
      .eq("meal_plan_id", id)
      .eq("document_type", "meal_plan")
      .order("created_at", { ascending: false });
    setPlanDocs(docs || []);

    setLoading(false);
  }, [id, user]);

  const fetchDocs = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("patient_documents" as any)
      .select("*")
      .eq("meal_plan_id", id)
      .eq("document_type", "meal_plan")
      .order("created_at", { ascending: false });
    setPlanDocs(data || []);
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const getItems = (day: number, mealType: MealType) =>
    items.filter((i) => i.day_of_week === day && i.meal_type === mealType);

  const openAddDialog = (day: number, mealType: MealType) => {
    setEditingItem(null);
    setDialogDay(day);
    setDialogMealType(mealType);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (item: MealPlanItem) => {
    setEditingItem(item);
    setDialogDay(item.day_of_week ?? 1);
    setDialogMealType(item.meal_type);
    setForm({
      title: item.title,
      description: item.description || "",
      calories_target: item.calories_target?.toString() || "",
      protein_target: item.protein_target?.toString() || "",
      carbs_target: item.carbs_target?.toString() || "",
      fat_target: item.fat_target?.toString() || "",
    });
    setDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!id || !form.title.trim()) return;
    setSaving(true);

    const payload = {
      meal_plan_id: id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      meal_type: dialogMealType,
      day_of_week: dialogDay,
      calories_target: form.calories_target ? parseInt(form.calories_target) : null,
      protein_target: form.protein_target ? parseFloat(form.protein_target) : null,
      carbs_target: form.carbs_target ? parseFloat(form.carbs_target) : null,
      fat_target: form.fat_target ? parseFloat(form.fat_target) : null,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("meal_plan_items")
        .update(payload)
        .eq("id", editingItem.id);
      if (error) toast.error("Erro ao atualizar: " + error.message);
      else toast.success("Item atualizado!");
    } else {
      const { error } = await supabase.from("meal_plan_items").insert(payload);
      if (error) toast.error("Erro ao adicionar: " + error.message);
      else toast.success("Item adicionado!");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDeleteItem = async (itemId: string) => {
    const { error } = await supabase.from("meal_plan_items").delete().eq("id", itemId);
    if (error) toast.error("Erro ao remover: " + error.message);
    else {
      toast.success("Removido!");
      fetchData();
    }
  };

  const handleCopyDay = async (sourceDay: number, targetDay: number) => {
    if (!id) return;
    const sourceItems = items.filter((i) => i.day_of_week === sourceDay);
    if (sourceItems.length === 0) {
      toast.error("Dia de origem vazio");
      return;
    }

    const inserts = sourceItems.map((item) => ({
      meal_plan_id: id,
      title: item.title,
      description: item.description,
      meal_type: item.meal_type,
      day_of_week: targetDay,
      calories_target: item.calories_target,
      protein_target: item.protein_target,
      carbs_target: item.carbs_target,
      fat_target: item.fat_target,
    }));

    const { error } = await supabase.from("meal_plan_items").insert(inserts);
    if (error) toast.error("Erro ao copiar: " + error.message);
    else {
      toast.success(`Copiado para ${DAYS[targetDay].label}!`);
      setCopySource(null);
      fetchData();
    }
  };

  const getDayTotals = (day: number) => {
    const dayItems = items.filter((i) => i.day_of_week === day);
    return {
      calories: dayItems.reduce((s, i) => s + (i.calories_target || 0), 0),
      protein: dayItems.reduce((s, i) => s + (Number(i.protein_target) || 0), 0),
      carbs: dayItems.reduce((s, i) => s + (Number(i.carbs_target) || 0), 0),
      fat: dayItems.reduce((s, i) => s + (Number(i.fat_target) || 0), 0),
    };
  };

  const getMealTypeTotals = (mealType: MealType) => {
    const mealItems = items.filter((i) => i.meal_type === mealType);
    return {
      calories: mealItems.reduce((s, i) => s + (i.calories_target || 0), 0),
      protein: mealItems.reduce((s, i) => s + (Number(i.protein_target) || 0), 0),
    };
  };

  // Save current meal item as reusable
  const handleSaveMeal = async () => {
    if (!user || !form.title.trim()) return;
    setSavingMeal(true);
    const { error } = await supabase.from("saved_meals" as any).insert({
      nutritionist_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      meal_type: dialogMealType,
      calories_target: form.calories_target ? parseInt(form.calories_target) : null,
      protein_target: form.protein_target ? parseFloat(form.protein_target) : null,
      carbs_target: form.carbs_target ? parseFloat(form.carbs_target) : null,
      fat_target: form.fat_target ? parseFloat(form.fat_target) : null,
    });
    setSavingMeal(false);
    if (error) toast.error("Erro ao salvar refeição: " + error.message);
    else toast.success("Refeição salva para reutilização! ⭐");
  };

  // Load saved meals
  const loadSavedMeals = async () => {
    if (!user) return;
    setLoadingSavedMeals(true);
    const { data } = await supabase
      .from("saved_meals" as any)
      .select("*")
      .eq("nutritionist_id", user.id)
      .order("created_at", { ascending: false });
    setSavedMeals(data || []);
    setLoadingSavedMeals(false);
  };

  // Import saved meal into form
  const importSavedMeal = (meal: any) => {
    setForm({
      title: meal.title,
      description: meal.description || "",
      calories_target: meal.calories_target?.toString() || "",
      protein_target: meal.protein_target?.toString() || "",
      carbs_target: meal.carbs_target?.toString() || "",
      fat_target: meal.fat_target?.toString() || "",
    });
    setSavedMealsDialogOpen(false);
    toast.success("Refeição importada!");
  };

  // Delete saved meal
  const deleteSavedMeal = async (mealId: string) => {
    await supabase.from("saved_meals" as any).delete().eq("id", mealId);
    setSavedMeals((prev) => prev.filter((m) => m.id !== mealId));
    toast.success("Refeição removida dos salvos");
  };

  // Save entire plan as template
  const handleSavePlanTemplate = async () => {
    if (!user || !plan || items.length === 0) return;
    setSavingPlan(true);
    const templateItems = items.map((i) => ({
      title: i.title,
      description: i.description,
      meal_type: i.meal_type,
      day_of_week: i.day_of_week,
      calories_target: i.calories_target,
      protein_target: i.protein_target,
      carbs_target: i.carbs_target,
      fat_target: i.fat_target,
    }));
    const { error } = await supabase.from("saved_plan_templates" as any).insert({
      nutritionist_id: user.id,
      title: plan.title + " (Modelo)",
      description: `${items.length} itens • Salvo em ${new Date().toLocaleDateString("pt-BR")}`,
      source_plan_id: plan.id,
      items: templateItems,
    });
    setSavingPlan(false);
    if (error) toast.error("Erro ao salvar modelo: " + error.message);
    else toast.success("Plano salvo como modelo! 📋");
  };

  // Load saved plan templates
  const loadSavedPlans = async () => {
    if (!user) return;
    setLoadingSavedPlans(true);
    const { data } = await supabase
      .from("saved_plan_templates" as any)
      .select("*")
      .eq("nutritionist_id", user.id)
      .order("created_at", { ascending: false });
    setSavedPlans(data || []);
    setLoadingSavedPlans(false);
  };

  // Apply a saved plan template to current plan
  const applySavedPlan = async (template: any) => {
    if (!id) return;
    const templateItems = (template.items as any[]).map((item: any) => ({
      meal_plan_id: id,
      title: item.title,
      description: item.description,
      meal_type: item.meal_type,
      day_of_week: item.day_of_week,
      calories_target: item.calories_target,
      protein_target: item.protein_target ? Number(item.protein_target) : null,
      carbs_target: item.carbs_target ? Number(item.carbs_target) : null,
      fat_target: item.fat_target ? Number(item.fat_target) : null,
    }));
    const { error } = await supabase.from("meal_plan_items").insert(templateItems);
    if (error) toast.error("Erro ao aplicar modelo: " + error.message);
    else {
      toast.success(`Modelo aplicado com ${templateItems.length} itens! 🎉`);
      setSavedPlansDialogOpen(false);
      fetchData();
    }
  };

  // Delete saved plan template
  const deleteSavedPlan = async (templateId: string) => {
    await supabase.from("saved_plan_templates" as any).delete().eq("id", templateId);
    setSavedPlans((prev) => prev.filter((p) => p.id !== templateId));
    toast.success("Modelo removido");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!plan) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Plano não encontrado.</p>
          <Button variant="ghost" onClick={() => navigate("/meal-plans")} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/meal-plans")}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-xl font-bold">{plan.title}</h1>
              <p className="text-sm text-muted-foreground">
                Paciente: {patientName} • Início: {new Date(plan.start_date).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/diet-templates?patientId=${plan.patient_id}&mealPlanId=${plan.id}`)}
              className="gap-1.5"
            >
              <BookOpen className="w-4 h-4" /> Modelos Pré-Prontos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { loadSavedPlans(); setSavedPlansDialogOpen(true); }}
              className="gap-1.5"
            >
              <FolderDown className="w-4 h-4" /> Importar Modelo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSavePlanTemplate}
              disabled={savingPlan || items.length === 0}
              className="gap-1.5"
            >
              {savingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkCheck className="w-4 h-4" />}
              Salvar Plano
            </Button>
            <Button
              onClick={async () => {
                if (!plan) return;
                setGenerating(true);
                try {
                  const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
                    body: { patient_id: plan.patient_id, meal_plan_id: plan.id },
                  });
                  if (error) throw error;
                  if (data?.error) throw new Error(data.error);
                  toast.success(`AI Plan gerou ${data.items_count} itens e ${data.tips_count} dicas! 🤖`);
                  fetchData();
                } catch (e: any) {
                  toast.error(e.message || "Erro ao gerar plano");
                }
                setGenerating(false);
              }}
              disabled={generating}
              className="gradient-primary gap-2 shadow-glow"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? "Gerando..." : "AI Plan ✨"}
            </Button>
          </div>
        </div>

        {/* Document Upload Section */}
        {plan && user && (
          <div className="glass rounded-xl p-5">
            <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
              📎 Documentos do Plano
            </h3>
            <DocumentUpload
              patientId={plan.patient_id}
              nutritionistId={user.id}
              documentType="meal_plan"
              referenceId={plan.id}
              documents={planDocs}
              onUploadComplete={fetchDocs}
            />
          </div>
        )}

        {/* Grid */}
        <div className="overflow-x-auto -mx-4 px-4 pb-4">
          <div className="min-w-[1100px]">
            {/* Day Headers */}
            <div className="grid grid-cols-[180px_repeat(7,1fr)] gap-1 mb-1">
              <div className="p-2" /> {/* empty corner */}
              {DAYS.map((day) => {
                const totals = getDayTotals(day.key);
                return (
                  <div key={day.key} className="glass rounded-lg p-2 text-center">
                    <p className="font-display font-semibold text-sm">{day.label}</p>
                    <div className="flex items-center justify-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Flame className="w-3 h-3 text-orange-400" />
                        {totals.calories}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Beef className="w-3 h-3 text-red-400" />
                        {totals.protein.toFixed(0)}g
                      </span>
                    </div>
                    {copySource && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1 h-6 text-[10px] px-2"
                        onClick={() => handleCopyDay(copySource.day, day.key)}
                      >
                        Colar aqui
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Meal Rows */}
            {MEAL_TYPES.map((meal) => (
              <div key={meal.key} className="grid grid-cols-[180px_repeat(7,1fr)] gap-1 mb-1">
                {/* Row label */}
                <div className="glass rounded-lg p-3 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span className={meal.color}>{meal.icon}</span>
                    <span className="font-display text-xs font-semibold">{meal.label}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {(() => {
                      const t = getMealTypeTotals(meal.key);
                      return `${t.calories} kcal • ${t.protein.toFixed(0)}g prot (semana)`;
                    })()}
                  </div>
                </div>

                {/* Day cells */}
                {DAYS.map((day) => {
                  const cellItems = getItems(day.key, meal.key);
                  return (
                    <div
                      key={day.key}
                      className="glass rounded-lg p-2 min-h-[100px] flex flex-col group relative hover:border-primary/30 transition-colors"
                    >
                      {/* Items */}
                      <div className="flex-1 space-y-1.5">
                        <AnimatePresence mode="popLayout">
                          {cellItems.map((item) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="bg-secondary/60 rounded-md px-2 py-1.5 cursor-pointer hover:bg-secondary transition-colors group/item"
                              onClick={() => openEditDialog(item)}
                            >
                              <p className="text-[11px] font-medium leading-tight truncate">
                                {item.title}
                              </p>
                              {item.description && (
                                <p className="text-[9px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex items-center gap-1.5 mt-1 text-[9px] text-muted-foreground">
                                {item.calories_target && (
                                  <span className="flex items-center gap-0.5">
                                    <Flame className="w-2.5 h-2.5 text-orange-400" />
                                    {item.calories_target}
                                  </span>
                                )}
                                {item.protein_target && (
                                  <span className="flex items-center gap-0.5">
                                    <Beef className="w-2.5 h-2.5 text-red-400" />
                                    {Number(item.protein_target).toFixed(0)}g
                                  </span>
                                )}
                                {item.carbs_target && (
                                  <span className="flex items-center gap-0.5">
                                    <Wheat className="w-2.5 h-2.5 text-amber-500" />
                                    {Number(item.carbs_target).toFixed(0)}g
                                  </span>
                                )}
                                {item.fat_target && (
                                  <span className="flex items-center gap-0.5">
                                    <Droplets className="w-2.5 h-2.5 text-blue-400" />
                                    {Number(item.fat_target).toFixed(0)}g
                                  </span>
                                )}
                              </div>
                              {/* Delete on hover */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem(item.id);
                                }}
                                className="absolute top-1 right-1 opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10"
                              >
                                <X className="w-3 h-3 text-destructive" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>

                      {/* Add button */}
                      <button
                        onClick={() => openAddDialog(day.key, meal.key)}
                        className="mt-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-dashed border-border hover:border-primary"
                      >
                        <Plus className="w-3 h-3" /> Adicionar
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Totals row */}
            <div className="grid grid-cols-[180px_repeat(7,1fr)] gap-1 mt-2">
              <div className="glass rounded-lg p-3 flex items-center">
                <span className="font-display text-xs font-bold text-primary">TOTAL DIÁRIO</span>
              </div>
              {DAYS.map((day) => {
                const t = getDayTotals(day.key);
                return (
                  <div key={day.key} className="glass rounded-lg p-2 border-primary/20">
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-400" />
                        <span className="font-semibold">{t.calories}</span>
                        <span className="text-muted-foreground">kcal</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Beef className="w-3 h-3 text-red-400" />
                        <span className="font-semibold">{t.protein.toFixed(0)}g</span>
                        <span className="text-muted-foreground">prot</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Wheat className="w-3 h-3 text-amber-500" />
                        <span className="font-semibold">{t.carbs.toFixed(0)}g</span>
                        <span className="text-muted-foreground">carb</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-blue-400" />
                        <span className="font-semibold">{t.fat.toFixed(0)}g</span>
                        <span className="text-muted-foreground">gord</span>
        </div>

        {/* Plan Scheduler */}
        <PlanScheduler mealPlanId={plan.id} planTitle={plan.title} />
      </div>
                    {/* Copy day button */}
                    <div className="mt-1 flex justify-center">
                      <button
                        onClick={() =>
                          setCopySource(
                            copySource?.day === day.key ? null : { day: day.key, mealType: "breakfast" }
                          )
                        }
                        className={`text-[9px] flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-colors ${
                          copySource?.day === day.key
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground hover:text-primary"
                        }`}
                      >
                        <Copy className="w-2.5 h-2.5" />
                        {copySource?.day === day.key ? "Copiando..." : "Copiar dia"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem ? "Editar Item" : "Adicionar Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={MEAL_TYPES.find((m) => m.key === dialogMealType)?.color}>
                {MEAL_TYPES.find((m) => m.key === dialogMealType)?.icon}
              </span>
              {MEAL_TYPES.find((m) => m.key === dialogMealType)?.label} — {DAYS[dialogDay]?.label}
            </div>

            <div>
              <Label>Alimento / Preparação</Label>
              <FoodAutocomplete
                value={form.title}
                onChange={(val) => setForm({ ...form, title: val })}
                onSelect={(food: FoodItem) => {
                  setForm({
                    ...form,
                    title: food.name,
                    description: food.portion,
                    calories_target: food.calories.toString(),
                    protein_target: food.protein.toString(),
                    carbs_target: food.carbs.toString(),
                    fat_target: food.fat.toString(),
                  });
                }}
              />
            </div>

            <div>
              <Label>Descrição / Porção</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: 150g de arroz + 120g de frango + salada"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-1 text-xs">
                  <Flame className="w-3 h-3 text-orange-400" /> Calorias (kcal)
                </Label>
                <Input
                  type="number"
                  value={form.calories_target}
                  onChange={(e) => setForm({ ...form, calories_target: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1 text-xs">
                  <Beef className="w-3 h-3 text-red-400" /> Proteína (g)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.protein_target}
                  onChange={(e) => setForm({ ...form, protein_target: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1 text-xs">
                  <Wheat className="w-3 h-3 text-amber-500" /> Carboidratos (g)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.carbs_target}
                  onChange={(e) => setForm({ ...form, carbs_target: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1 text-xs">
                  <Droplets className="w-3 h-3 text-blue-400" /> Gordura (g)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.fat_target}
                  onChange={(e) => setForm({ ...form, fat_target: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Save & Import meal buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => { loadSavedMeals(); setSavedMealsDialogOpen(true); }}
              >
                <FolderDown className="w-3.5 h-3.5" /> Importar Salva
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={handleSaveMeal}
                disabled={savingMeal || !form.title.trim()}
              >
                {savingMeal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
                Salvar Refeição
              </Button>
            </div>

            <div className="flex gap-2">
              {editingItem && (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={async () => {
                    await handleDeleteItem(editingItem.id);
                    setDialogOpen(false);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Remover
                </Button>
              )}
              <Button
                className="flex-1 gradient-primary"
                onClick={handleSaveItem}
                disabled={saving || !form.title.trim()}
              >
                {saving ? "Salvando..." : editingItem ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Saved Meals Dialog */}
      <Dialog open={savedMealsDialogOpen} onOpenChange={setSavedMealsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-primary" /> Refeições Salvas
            </DialogTitle>
          </DialogHeader>
          {loadingSavedMeals ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : savedMeals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma refeição salva ainda.</p>
              <p className="text-xs mt-1">Salve refeições ao adicionar itens ao plano.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {savedMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center gap-2 p-3 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors group cursor-pointer"
                  onClick={() => importSavedMeal(meal)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{meal.title}</p>
                    {meal.description && (
                      <p className="text-xs text-muted-foreground truncate">{meal.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      {meal.calories_target && <span>{meal.calories_target} kcal</span>}
                      {meal.protein_target && <span>{Number(meal.protein_target).toFixed(0)}g prot</span>}
                      {meal.carbs_target && <span>{Number(meal.carbs_target).toFixed(0)}g carb</span>}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSavedMeal(meal.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Saved Plan Templates Dialog */}
      <Dialog open={savedPlansDialogOpen} onOpenChange={setSavedPlansDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-primary" /> Modelos de Plano Salvos
            </DialogTitle>
          </DialogHeader>
          {loadingSavedPlans ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : savedPlans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookmarkCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum modelo salvo ainda.</p>
              <p className="text-xs mt-1">Clique em "Salvar Plano" para criar um modelo reutilizável.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {savedPlans.map((tpl) => {
                const itemCount = Array.isArray(tpl.items) ? tpl.items.length : 0;
                return (
                  <div
                    key={tpl.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors group cursor-pointer"
                    onClick={() => applySavedPlan(tpl)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tpl.title}</p>
                      {tpl.description && (
                        <p className="text-xs text-muted-foreground truncate">{tpl.description}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {itemCount} itens • {new Date(tpl.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSavedPlan(tpl.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
