import { useState } from "react";
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
import { Plus, Search, Package, Pencil, Trash2 } from "lucide-react";

const CATEGORIES = [
  { value: "proteinas", label: "🥩 Proteínas" },
  { value: "carboidratos", label: "🍚 Carboidratos" },
  { value: "verduras", label: "🥬 Verduras e Legumes" },
  { value: "frutas", label: "🍎 Frutas" },
  { value: "gorduras", label: "🥑 Gorduras" },
  { value: "temperos", label: "🧂 Temperos" },
  { value: "laticinios", label: "🧀 Laticínios" },
  { value: "graos", label: "🌾 Grãos e Cereais" },
  { value: "outros", label: "📦 Outros" },
];

const DEFAULT_PRODUCTS = [
  { name: "Frango (peito)", category: "proteinas", calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6, unit: "kg" },
  { name: "Arroz branco", category: "carboidratos", calories_per_100g: 130, protein_per_100g: 2.7, carbs_per_100g: 28, fat_per_100g: 0.3, unit: "kg" },
  { name: "Feijão carioca", category: "graos", calories_per_100g: 76, protein_per_100g: 4.8, carbs_per_100g: 13.6, fat_per_100g: 0.5, unit: "kg" },
  { name: "Batata doce", category: "carboidratos", calories_per_100g: 86, protein_per_100g: 1.6, carbs_per_100g: 20, fat_per_100g: 0.1, unit: "kg" },
  { name: "Brócolis", category: "verduras", calories_per_100g: 34, protein_per_100g: 2.8, carbs_per_100g: 7, fat_per_100g: 0.4, unit: "kg" },
  { name: "Ovo", category: "proteinas", calories_per_100g: 155, protein_per_100g: 13, carbs_per_100g: 1.1, fat_per_100g: 11, unit: "un" },
  { name: "Azeite de oliva", category: "gorduras", calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, unit: "L" },
  { name: "Carne bovina (patinho)", category: "proteinas", calories_per_100g: 133, protein_per_100g: 26, carbs_per_100g: 0, fat_per_100g: 3, unit: "kg" },
  { name: "Macarrão integral", category: "carboidratos", calories_per_100g: 124, protein_per_100g: 5, carbs_per_100g: 25, fat_per_100g: 0.5, unit: "kg" },
  { name: "Banana", category: "frutas", calories_per_100g: 89, protein_per_100g: 1.1, carbs_per_100g: 23, fat_per_100g: 0.3, unit: "kg" },
  { name: "Queijo cottage", category: "laticinios", calories_per_100g: 98, protein_per_100g: 11, carbs_per_100g: 3.4, fat_per_100g: 4.3, unit: "kg" },
  { name: "Aveia", category: "graos", calories_per_100g: 68, protein_per_100g: 2.4, carbs_per_100g: 12, fat_per_100g: 1.4, unit: "kg" },
  { name: "Salmão", category: "proteinas", calories_per_100g: 208, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 13, unit: "kg" },
  { name: "Tilápia", category: "proteinas", calories_per_100g: 96, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 1.7, unit: "kg" },
  { name: "Tomate", category: "verduras", calories_per_100g: 18, protein_per_100g: 0.9, carbs_per_100g: 3.9, fat_per_100g: 0.2, unit: "kg" },
  { name: "Cebola", category: "temperos", calories_per_100g: 40, protein_per_100g: 1.1, carbs_per_100g: 9, fat_per_100g: 0.1, unit: "kg" },
  { name: "Alho", category: "temperos", calories_per_100g: 149, protein_per_100g: 6.4, carbs_per_100g: 33, fat_per_100g: 0.5, unit: "kg" },
  { name: "Leite integral", category: "laticinios", calories_per_100g: 61, protein_per_100g: 3.2, carbs_per_100g: 4.8, fat_per_100g: 3.3, unit: "L" },
  { name: "Manteiga", category: "gorduras", calories_per_100g: 717, protein_per_100g: 0.9, carbs_per_100g: 0.1, fat_per_100g: 81, unit: "kg" },
  { name: "Sal", category: "temperos", calories_per_100g: 0, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 0, unit: "kg" },
];

interface ProductForm {
  name: string;
  category: string;
  unit: string;
  price_per_unit: string;
  stock_quantity: string;
  calories_per_100g: string;
  protein_per_100g: string;
  carbs_per_100g: string;
  fat_per_100g: string;
  supplier: string;
}

const emptyForm: ProductForm = {
  name: "", category: "outros", unit: "kg", price_per_unit: "", stock_quantity: "",
  calories_per_100g: "", protein_per_100g: "", carbs_per_100g: "", fat_per_100g: "", supplier: "",
};

export default function StoreProducts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["store-products", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_products")
        .select("*")
        .eq("owner_id", user!.id)
        .eq("is_active", true)
        .order("category")
        .order("name");
      return data || [];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (f: ProductForm) => {
      const payload = {
        owner_id: user!.id,
        name: f.name.trim(),
        category: f.category,
        unit: f.unit,
        price_per_unit: parseFloat(f.price_per_unit) || 0,
        stock_quantity: parseFloat(f.stock_quantity) || 0,
        calories_per_100g: parseFloat(f.calories_per_100g) || 0,
        protein_per_100g: parseFloat(f.protein_per_100g) || 0,
        carbs_per_100g: parseFloat(f.carbs_per_100g) || 0,
        fat_per_100g: parseFloat(f.fat_per_100g) || 0,
        supplier: f.supplier.trim() || null,
      };
      if (editId) {
        const { error } = await supabase.from("store_products").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-products"] });
      toast.success(editId ? "Produto atualizado!" : "Produto adicionado!");
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_products").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-products"] });
      toast.success("Produto removido");
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const rows = DEFAULT_PRODUCTS.map((p) => ({ ...p, owner_id: user!.id, price_per_unit: 0, stock_quantity: 0 }));
      const { error } = await supabase.from("store_products").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-products"] });
      toast.success("Lista base criada com 20 produtos!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = products.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()));

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      name: p.name, category: p.category, unit: p.unit,
      price_per_unit: String(p.price_per_unit), stock_quantity: String(p.stock_quantity),
      calories_per_100g: String(p.calories_per_100g), protein_per_100g: String(p.protein_per_100g),
      carbs_per_100g: String(p.carbs_per_100g), fat_per_100g: String(p.fat_per_100g),
      supplier: p.supplier || "",
    });
    setDialogOpen(true);
  };

  const catLabel = (val: string) => CATEGORIES.find((c) => c.value === val)?.label || val;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">📦 Meus Produtos</h1>
          <p className="text-muted-foreground">Ingredientes com preço, estoque e informações nutricionais</p>
        </div>
        <div className="flex gap-2">
          {products.length === 0 && (
            <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              Carregar Lista Base
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Novo Produto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div>
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Frango (peito)" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Categoria</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Unidade</Label>
                    <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="un">un</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Preço por {form.unit} (R$)</Label>
                    <Input type="number" step="0.01" value={form.price_per_unit} onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Estoque ({form.unit})</Label>
                    <Input type="number" step="0.001" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} placeholder="0" />
                  </div>
                </div>
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">Macros por 100g</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Calorias (kcal)</Label>
                      <Input type="number" value={form.calories_per_100g} onChange={(e) => setForm({ ...form, calories_per_100g: e.target.value })} />
                    </div>
                    <div>
                      <Label>Proteína (g)</Label>
                      <Input type="number" value={form.protein_per_100g} onChange={(e) => setForm({ ...form, protein_per_100g: e.target.value })} />
                    </div>
                    <div>
                      <Label>Carboidratos (g)</Label>
                      <Input type="number" value={form.carbs_per_100g} onChange={(e) => setForm({ ...form, carbs_per_100g: e.target.value })} />
                    </div>
                    <div>
                      <Label>Gordura (g)</Label>
                      <Input type="number" value={form.fat_per_100g} onChange={(e) => setForm({ ...form, fat_per_100g: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Fornecedor</Label>
                  <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Opcional" />
                </div>
                <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name.trim() || saveMutation.isPending}>
                  {editId ? "Salvar Alterações" : "Adicionar Produto"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum produto encontrado. Adicione seu primeiro ou carregue a lista base.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p: any) => (
            <Card key={p.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{p.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{catLabel(p.category)}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>R$ {Number(p.price_per_unit).toFixed(2)}/{p.unit}</span>
                    <span>Estoque: {Number(p.stock_quantity).toFixed(1)} {p.unit}</span>
                    <span>{Number(p.calories_per_100g).toFixed(0)} kcal</span>
                    <span>P: {Number(p.protein_per_100g).toFixed(1)}g</span>
                    <span>C: {Number(p.carbs_per_100g).toFixed(1)}g</span>
                    <span>G: {Number(p.fat_per_100g).toFixed(1)}g</span>
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remover produto?")) deleteMutation.mutate(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
