import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ShoppingCart, Plus, Trash2, Check, RefreshCw, Sparkles } from "lucide-react";

interface ShoppingItem {
  id: string;
  item_name: string;
  quantity: string | null;
  category: string;
  is_checked: boolean;
}

const categoryLabels: Record<string, string> = {
  protein: "🥩 Proteínas", carbs: "🌾 Carboidratos", vegetables: "🥬 Vegetais",
  fruits: "🍎 Frutas", dairy: "🥛 Laticínios", oils: "🫒 Óleos/Gorduras",
  seasoning: "🧂 Temperos", other: "📦 Outros",
};

export default function ShoppingList() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [generating, setGenerating] = useState(false);

  const fetchItems = async () => {
    if (!user) return;
    const { data } = await supabase.from("shopping_list_items").select("*").eq("patient_id", user.id).order("category").order("is_checked");
    setItems(data || []);
  };

  useEffect(() => { fetchItems(); }, [user]);

  const addItem = async () => {
    if (!user || !newItem.trim()) return;
    const { error } = await supabase.from("shopping_list_items").insert({
      patient_id: user.id, item_name: newItem, category: "other",
    });
    if (error) toast.error(error.message);
    else { setNewItem(""); fetchItems(); }
  };

  const toggleCheck = async (id: string, current: boolean) => {
    await supabase.from("shopping_list_items").update({ is_checked: !current }).eq("id", id);
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("shopping_list_items").delete().eq("id", id);
    fetchItems();
  };

  const clearChecked = async () => {
    if (!user) return;
    await supabase.from("shopping_list_items").delete().eq("patient_id", user.id).eq("is_checked", true);
    toast.success("Itens comprados removidos!"); fetchItems();
  };

  const generateFromPlan = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      // Fetch active meal plan items
      const { data: plans } = await supabase.from("meal_plans").select("id").eq("patient_id", user.id).eq("is_active", true).limit(1);
      if (!plans?.[0]) { toast.error("Nenhum plano alimentar ativo."); setGenerating(false); return; }

      const { data: planItems } = await supabase.from("meal_plan_items").select("description, title").eq("meal_plan_id", plans[0].id);

      if (!planItems?.length) { toast.error("Plano sem itens."); setGenerating(false); return; }

      // Extract food items from descriptions
      const foodItems = planItems
        .filter(item => item.description)
        .flatMap(item => (item.description || "").split(/[,;\n]/).map(s => s.trim()).filter(Boolean));

      // Deduplicate and insert
      const unique = [...new Set(foodItems.map(f => f.toLowerCase()))];
      const inserts = unique.map(item => ({
        patient_id: user.id, item_name: item, meal_plan_id: plans[0].id, category: "other",
      }));

      if (inserts.length > 0) {
        const { error } = await supabase.from("shopping_list_items").insert(inserts);
        if (error) toast.error(error.message);
        else toast.success(`${inserts.length} itens adicionados do plano!`);
      }
      fetchItems();
    } catch (e: any) {
      toast.error("Erro ao gerar lista.");
    }
    setGenerating(false);
  };

  // Group by category
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const total = items.length;
  const checked = items.filter(i => i.is_checked).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-primary" /> Lista de Compras
            </h1>
            <p className="text-sm text-muted-foreground">{checked}/{total} itens comprados</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generateFromPlan} disabled={generating} className="gap-2">
              <Sparkles className="w-4 h-4" /> {generating ? "Gerando..." : "Gerar do Plano"}
            </Button>
            {checked > 0 && (
              <Button variant="outline" onClick={clearChecked} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Limpar Comprados
              </Button>
            )}
          </div>
        </div>

        {/* Add item */}
        <div className="flex gap-2">
          <Input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Adicionar item..." onKeyDown={e => e.key === "Enter" && addItem()} className="flex-1" />
          <Button onClick={addItem} className="gradient-primary"><Plus className="w-4 h-4" /></Button>
        </div>

        {/* Items by category */}
        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <h3 className="text-sm font-medium mb-2">{categoryLabels[cat] || cat}</h3>
            <div className="space-y-1">
              {catItems.map(item => (
                <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    item.is_checked ? "bg-muted/50 border-border" : "bg-card border-border hover:border-primary/30"
                  }`}
                >
                  <button onClick={() => toggleCheck(item.id, item.is_checked)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      item.is_checked ? "bg-primary border-primary" : "border-muted-foreground"
                    }`}
                  >
                    {item.is_checked && <Check className="w-3 h-3 text-primary-foreground" />}
                  </button>
                  <span className={`flex-1 text-sm ${item.is_checked ? "line-through text-muted-foreground" : ""}`}>
                    {item.item_name}
                  </span>
                  {item.quantity && <span className="text-xs text-muted-foreground">{item.quantity}</span>}
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteItem(item.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <Card className="glass"><CardContent className="py-12 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Lista vazia. Adicione itens ou gere do plano alimentar.</p>
          </CardContent></Card>
        )}
      </div>
    </DashboardLayout>
  );
}
