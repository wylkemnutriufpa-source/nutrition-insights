import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@v1/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { toast } from "sonner";
import { Plus, FileText, Trash2, Calculator, DollarSign, Flame, Beef, Wheat } from "lucide-react";

interface SheetItem {
  product_id: string;
  product_name: string;
  quantity_grams: number;
  cost: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  price_per_unit: number;
  unit: string;
  cal100: number;
  pro100: number;
  carb100: number;
  fat100: number;
}

export default function TechnicalSheets() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetName, setSheetName] = useState("");
  const [sheetDesc, setSheetDesc] = useState("");
  const [portions, setPortions] = useState("1");
  const [salePrice, setSalePrice] = useState("");
  const [items, setItems] = useState<SheetItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState("");

  const { data: sheets = [], isLoading: sheetsLoading } = useQuery({
    queryKey: ["technical-sheets", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("technical_sheets")
        .select("*")
        .eq("owner_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["store-products", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_products")
        .select("*")
        .eq("owner_id", user!.id)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
    enabled: !!user,
  });

  // Real-time calculations
  const totals = useMemo(() => {
    const totalWeight = items.reduce((s, i) => s + i.quantity_grams, 0);
    const totalCost = items.reduce((s, i) => s + i.cost, 0);
    const totalCalories = items.reduce((s, i) => s + i.calories, 0);
    const totalProtein = items.reduce((s, i) => s + i.protein, 0);
    const totalCarbs = items.reduce((s, i) => s + i.carbs, 0);
    const totalFat = items.reduce((s, i) => s + i.fat, 0);
    const p = parseInt(portions) || 1;
    const sp = parseFloat(salePrice) || 0;
    const costPerPortion = p > 0 ? totalCost / p : 0;
    const marginPercent = sp > 0 ? ((sp - costPerPortion) / sp) * 100 : 0;
    return { totalWeight, totalCost, totalCalories, totalProtein, totalCarbs, totalFat, costPerPortion, marginPercent };
  }, [items, portions, salePrice]);

  const addItem = useCallback(() => {
    const prod = products.find((p: any) => p.id === selectedProduct);
    if (!prod || !qty) return;
    const grams = parseFloat(qty);
    if (grams <= 0) return;

    const factor = grams / 100;
    // Cost calculation: if unit is kg, price_per_unit is per kg => cost = (grams/1000) * price
    // if unit is un, treat as per unit and grams as number of units * approximate weight
    const pricePerUnit = Number(prod.price_per_unit);
    let cost = 0;
    if (prod.unit === "kg") {
      cost = (grams / 1000) * pricePerUnit;
    } else if (prod.unit === "L") {
      cost = (grams / 1000) * pricePerUnit; // ml -> L
    } else {
      cost = (grams / 100) * pricePerUnit; // rough approximation for units
    }

    const newItem: SheetItem = {
      product_id: prod.id,
      product_name: prod.name,
      quantity_grams: grams,
      cost: Math.round(cost * 100) / 100,
      calories: Math.round(Number(prod.calories_per_100g) * factor * 100) / 100,
      protein: Math.round(Number(prod.protein_per_100g) * factor * 100) / 100,
      carbs: Math.round(Number(prod.carbs_per_100g) * factor * 100) / 100,
      fat: Math.round(Number(prod.fat_per_100g) * factor * 100) / 100,
      price_per_unit: pricePerUnit,
      unit: prod.unit,
      cal100: Number(prod.calories_per_100g),
      pro100: Number(prod.protein_per_100g),
      carb100: Number(prod.carbs_per_100g),
      fat100: Number(prod.fat_per_100g),
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedProduct("");
    setQty("");
  }, [selectedProduct, qty, products]);

  const updateItemQty = (index: number, newGrams: number) => {
    setItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const factor = newGrams / 100;
      let cost = 0;
      if (item.unit === "kg" || item.unit === "L") {
        cost = (newGrams / 1000) * item.price_per_unit;
      } else {
        cost = (newGrams / 100) * item.price_per_unit;
      }
      return {
        ...item,
        quantity_grams: newGrams,
        cost: Math.round(cost * 100) / 100,
        calories: Math.round(item.cal100 * factor * 100) / 100,
        protein: Math.round(item.pro100 * factor * 100) / 100,
        carbs: Math.round(item.carb100 * factor * 100) / 100,
        fat: Math.round(item.fat100 * factor * 100) / 100,
      };
    }));
  };

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const p = parseInt(portions) || 1;
      const sp = parseFloat(salePrice) || 0;
      const { data: sheet, error } = await supabase.from("technical_sheets").insert({
        owner_id: user!.id,
        name: sheetName.trim(),
        description: sheetDesc.trim() || null,
        portions: p,
        total_weight_g: totals.totalWeight,
        total_calories: totals.totalCalories,
        total_protein: totals.totalProtein,
        total_carbs: totals.totalCarbs,
        total_fat: totals.totalFat,
        total_cost: totals.totalCost,
        cost_per_portion: totals.costPerPortion,
        sale_price: sp,
        margin_percent: totals.marginPercent,
      }).select("id").single();
      if (error) throw error;

      if (items.length > 0) {
        const rows = items.map((i) => ({
          sheet_id: sheet.id,
          product_id: i.product_id,
          quantity_grams: i.quantity_grams,
          cost: i.cost,
          calories: i.calories,
          protein: i.protein,
          carbs: i.carbs,
          fat: i.fat,
        }));
        const { error: itemError } = await supabase.from("technical_sheet_items").insert(rows);
        if (itemError) throw itemError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technical-sheets"] });
      toast.success("Ficha técnica criada!");
      setDialogOpen(false);
      setSheetName("");
      setSheetDesc("");
      setPortions("1");
      setSalePrice("");
      setItems([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("technical_sheets").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technical-sheets"] });
      toast.success("Ficha removida");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">📋 Fichas Técnicas</h1>
          <p className="text-muted-foreground">Monte receitas, calcule custo e margem em tempo real</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nova Ficha Técnica</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Ficha Técnica</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nome do prato *</Label>
                  <Input value={sheetName} onChange={(e) => setSheetName(e.target.value)} placeholder="Ex: Marmita Frango Fit" />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input value={sheetDesc} onChange={(e) => setSheetDesc(e.target.value)} placeholder="Opcional" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Porções</Label>
                  <Input type="number" min="1" value={portions} onChange={(e) => setPortions(e.target.value)} />
                </div>
                <div>
                  <Label>Preço de venda (R$)</Label>
                  <Input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0.00" />
                </div>
              </div>

              {/* Add ingredient */}
              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="text-sm font-medium mb-2">Adicionar ingrediente</p>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger><SelectValue placeholder="Selecione produto" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} (R${Number(p.price_per_unit).toFixed(2)}/{p.unit})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="g" />
                  </div>
                  <Button size="sm" onClick={addItem} disabled={!selectedProduct || !qty}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              {/* Ingredient list */}
              {items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">Ingrediente</th>
                        <th className="text-right p-2 w-20">Qtd (g)</th>
                        <th className="text-right p-2 w-16">R$</th>
                        <th className="text-right p-2 w-14">kcal</th>
                        <th className="text-right p-2 w-12">P</th>
                        <th className="text-right p-2 w-12">C</th>
                        <th className="text-right p-2 w-12">G</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 truncate max-w-[120px]">{item.product_name}</td>
                          <td className="p-2 text-right">
                            <Input
                              type="number"
                              className="h-7 w-20 text-right text-xs"
                              value={item.quantity_grams}
                              onChange={(e) => updateItemQty(i, parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="p-2 text-right">{item.cost.toFixed(2)}</td>
                          <td className="p-2 text-right">{item.calories.toFixed(0)}</td>
                          <td className="p-2 text-right">{item.protein.toFixed(1)}</td>
                          <td className="p-2 text-right">{item.carbs.toFixed(1)}</td>
                          <td className="p-2 text-right">{item.fat.toFixed(1)}</td>
                          <td className="p-2">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(i)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Real-time totals */}
              {items.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="border-emerald-500/30">
                    <CardContent className="p-3 text-center">
                      <DollarSign className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                      <p className="text-xs text-muted-foreground">Custo Total</p>
                      <p className="text-lg font-bold text-emerald-600">R$ {totals.totalCost.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-500/30">
                    <CardContent className="p-3 text-center">
                      <Calculator className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                      <p className="text-xs text-muted-foreground">Custo/Porção</p>
                      <p className="text-lg font-bold text-blue-600">R$ {totals.costPerPortion.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className={`border-${totals.marginPercent >= 30 ? 'emerald' : totals.marginPercent >= 15 ? 'amber' : 'red'}-500/30`}>
                    <CardContent className="p-3 text-center">
                      <DollarSign className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                      <p className="text-xs text-muted-foreground">Margem</p>
                      <p className={`text-lg font-bold ${totals.marginPercent >= 30 ? 'text-emerald-600' : totals.marginPercent >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                        {totals.marginPercent.toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-orange-500/30">
                    <CardContent className="p-3 text-center">
                      <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                      <p className="text-xs text-muted-foreground">Peso Total</p>
                      <p className="text-lg font-bold text-orange-600">{totals.totalWeight.toFixed(0)}g</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Macros summary */}
              {items.length > 0 && (
                <div className="flex items-center justify-center gap-6 text-sm">
                  <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-500" /> {totals.totalCalories.toFixed(0)} kcal</span>
                  <span className="flex items-center gap-1"><Beef className="h-3.5 w-3.5 text-red-500" /> {totals.totalProtein.toFixed(1)}g P</span>
                  <span className="flex items-center gap-1"><Wheat className="h-3.5 w-3.5 text-amber-500" /> {totals.totalCarbs.toFixed(1)}g C</span>
                  <span className="flex items-center gap-1">🫒 {totals.totalFat.toFixed(1)}g G</span>
                </div>
              )}

              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!sheetName.trim() || items.length === 0 || saveMutation.isPending}
                className="w-full"
              >
                Salvar Ficha Técnica
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {sheetsLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : sheets.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Nenhuma ficha técnica ainda. Crie sua primeira!</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sheets.map((s: any) => (
            <Card key={s.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remover ficha?")) deleteMutation.mutate(s.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Porções:</span>
                    <span className="font-medium">{s.portions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Peso:</span>
                    <span className="font-medium">{Number(s.total_weight_g).toFixed(0)}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custo:</span>
                    <span className="font-medium text-emerald-600">R$ {Number(s.total_cost).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custo/porção:</span>
                    <span className="font-medium">R$ {Number(s.cost_per_portion).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Venda:</span>
                    <span className="font-medium">R$ {Number(s.sale_price).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margem:</span>
                    <span className={`font-medium ${Number(s.margin_percent) >= 30 ? 'text-emerald-600' : Number(s.margin_percent) >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                      {Number(s.margin_percent).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span>{Number(s.total_calories).toFixed(0)} kcal</span>
                  <span>P: {Number(s.total_protein).toFixed(1)}g</span>
                  <span>C: {Number(s.total_carbs).toFixed(1)}g</span>
                  <span>G: {Number(s.total_fat).toFixed(1)}g</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
