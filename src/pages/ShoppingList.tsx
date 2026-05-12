import { useEffect, useState } from "react";
import { useAuth } from "@v1/lib/auth";
import { useTenant } from "@v1/lib/tenantContext";
import { withTenantFilter } from "@v1/lib/tenantQueryHelpers";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
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

// Try to guess category from food name
function guessCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/frango|carne|peixe|ovo|atum|salmão|tilápia|peito|patinho|alcatra|sardinha|camarão|whey|proteín/i.test(lower)) return "protein";
  if (/arroz|pão|macarrão|batata|aveia|tapioca|mandioca|inhame|granola|cereal|torrada|cuscuz/i.test(lower)) return "carbs";
  if (/alface|tomate|brócolis|espinafre|rúcula|cenoura|pepino|abobrinha|couve|chuchu|berinjela|beterraba|vagem/i.test(lower)) return "vegetables";
  if (/banana|maçã|morango|laranja|melão|mamão|abacate|uva|kiwi|manga|melancia|pera|limão/i.test(lower)) return "fruits";
  if (/leite|queijo|iogurte|cream cheese|requeijão|ricota|cottage|manteiga/i.test(lower)) return "dairy";
  if (/azeite|óleo|castanha|nozes|amendoim|amêndoa|linhaça|chia|coco|pasta de amendoim/i.test(lower)) return "oils";
  if (/sal|pimenta|orégano|alho|cebola|cheiro-verde|manjericão|canela|açúcar|adoçante|vinagre|mostarda|molho/i.test(lower)) return "seasoning";
  return "other";
}

export default function ShoppingList() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
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
      patient_id: user.id, item_name: newItem, category: guessCategory(newItem),
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
      // 1. Find delivered plan only
      const { data: plans } = await withTenantFilter(
        supabase
          .from("meal_plans")
          .select("id, title, plan_status")
          .eq("patient_id", user.id)
          .eq("is_active", true)
          .eq("plan_status", "published_to_patient")
          .order("updated_at", { ascending: false })
          .limit(1),
        tenantId
      );

      if (!plans?.[0]) {
        toast.error("Nenhum plano alimentar ativo encontrado. Peça ao seu nutricionista para aprovar/publicar seu plano.");
        setGenerating(false);
        return;
      }

      const plan = plans[0];

      // 2. Fetch meal_plan_items with descriptions
      const { data: planItems } = await supabase
        .from("meal_plan_items")
        .select("description, title")
        .eq("meal_plan_id", plan.id);

      if (!planItems?.length) {
        toast.error("Plano sem refeições cadastradas.");
        setGenerating(false);
        return;
      }

      // 3. Extract food items from descriptions AND titles
      const foodItems: string[] = [];

      planItems.forEach(item => {
        // Extract from description (foods are separated by comma, semicolon, newline, or " - ")
        if (item.description) {
          const parts = item.description
            .split(/[;\n]/)
            .flatMap(line => line.split(/\s*-\s+/))
            .map(s => s.trim())
            .filter(Boolean)
            .filter(s => s.length > 2 && s.length < 80); // Skip too short or too long strings
          foodItems.push(...parts);
        }
      });

      if (foodItems.length === 0) {
        toast.error("Não foi possível extrair alimentos do plano. Verifique se as descrições das refeições estão preenchidas.");
        setGenerating(false);
        return;
      }

      // 4. Deduplicate and clean up
      const seen = new Set<string>();
      const unique: string[] = [];
      foodItems.forEach(f => {
        // Clean: remove quantities like "100g", "2 unidades", leading numbers
        const cleaned = f
          .replace(/^\d+[\s]*[gG][\s]+/g, '') // "100g "
          .replace(/^\d+[\s]*(ml|g|kg|un|unidade|colher|xícara|fatia|porção|pedaço)\b[\s]*(de[\s]+)?/gi, '')
          .replace(/^\d+[\s]*[-–]\s*/g, '')
          .trim();
        
        if (cleaned.length < 2) return;
        const key = cleaned.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(cleaned);
        }
      });

      // 5. Get existing items to avoid duplicates
      const { data: existing } = await supabase
        .from("shopping_list_items")
        .select("item_name")
        .eq("patient_id", user.id);
      const existingNames = new Set((existing || []).map((e: any) => e.item_name.toLowerCase()));

      const inserts = unique
        .filter(name => !existingNames.has(name.toLowerCase()))
        .map(name => ({
          patient_id: user.id,
          item_name: name,
          meal_plan_id: plan.id,
          category: guessCategory(name),
        }));

      if (inserts.length === 0) {
        toast.info("Todos os itens do plano já estão na sua lista!");
        setGenerating(false);
        return;
      }

      const { error } = await supabase.from("shopping_list_items").insert(inserts);
      if (error) toast.error(error.message);
      else toast.success(`${inserts.length} itens adicionados do plano "${plan.title}"!`);

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
