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
  Flame, Beef, Wheat, Droplets, Leaf, PencilLine, X, Check
} from "lucide-react";
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

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MealPlanItem | null>(null);
  const [dialogMealType, setDialogMealType] = useState<MealType>("breakfast");
  const [dialogDay, setDialogDay] = useState<number>(1);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Copy state
  const [copySource, setCopySource] = useState<{ day: number; mealType: MealType } | null>(null);

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
    setLoading(false);
  }, [id, user]);

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
        </div>

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
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Arroz integral com frango grelhado"
                autoFocus
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
    </DashboardLayout>
  );
}
