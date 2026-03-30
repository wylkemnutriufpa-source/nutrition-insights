import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { getTenantIdForInsert } from "@/lib/tenantQueryHelpers";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BookOpen, Plus, Search, Filter, Image as ImageIcon, Pencil, Trash2, Link2, Unlink, Eye,
  RefreshCw, BarChart3, AlertTriangle, Loader2,
} from "lucide-react";
import MealVisualCard from "@/components/meals/MealVisualCard";
import MealVisualModal from "@/components/meals/MealVisualModal";
import { runAutoAssociation, type AssociationReport } from "@/lib/mealVisualAssociation";
import type { MealVisualItem, MealVisualAlias } from "@/types/mealVisualLibrary";
import { MEAL_VISUAL_CATEGORIES } from "@/types/mealVisualLibrary";

export default function MealVisualLibraryAdmin() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [items, setItems] = useState<MealVisualItem[]>([]);
  const [aliases, setAliases] = useState<MealVisualAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<MealVisualItem | null>(null);
  const [editItem, setEditItem] = useState<MealVisualItem | null>(null);
  const [activeTab, setActiveTab] = useState("library");
  const [auditReport, setAuditReport] = useState<AssociationReport | null>(null);
  const [auditRunning, setAuditRunning] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    category: "cafe_da_manha",
    subcategory: "",
    short_description: "",
    base_recipe: "",
    default_portion: "",
    default_calories: "",
    default_protein: "",
    default_carbs: "",
    default_fat: "",
    image_url: "",
    tags: "",
  });

  const [aliasInput, setAliasInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: libData }, { data: aliasData }] = await Promise.all([
      supabase.from("meal_visual_library" as any).select("*").order("sort_order"),
      supabase.from("meal_visual_aliases" as any).select("*"),
    ]);
    setItems((libData || []) as unknown as MealVisualItem[]);
    setAliases((aliasData || []) as unknown as MealVisualAlias[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (filterCat !== "all") result = result.filter((i) => i.category === filterCat);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (i) => i.display_name.toLowerCase().includes(s) || i.name.toLowerCase().includes(s)
      );
    }
    return result;
  }, [items, filterCat, search]);

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.display_name || !form.category) return;
    setSubmitting(true);

    const slug = slugify(form.display_name);
    const tagsArr = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const aliasesArr = aliasInput.split(",").map((a) => a.trim()).filter(Boolean);

    const payload: any = {
      slug,
      name: slug,
      display_name: form.display_name,
      category: form.category,
      subcategory: form.subcategory || null,
      short_description: form.short_description || null,
      base_recipe: form.base_recipe || null,
      default_portion: form.default_portion || null,
      default_calories: form.default_calories ? Number(form.default_calories) : null,
      default_protein: form.default_protein ? Number(form.default_protein) : null,
      default_carbs: form.default_carbs ? Number(form.default_carbs) : null,
      default_fat: form.default_fat ? Number(form.default_fat) : null,
      image_url: form.image_url || null,
      tags: tagsArr,
      search_terms: tagsArr,
      created_by: user?.id,
      ...getTenantIdForInsert(tenantId),
    };

    const { data, error } = await supabase.from("meal_visual_library" as any).insert(payload).select().single();
    if (error) {
      toast.error("Erro: " + error.message);
    } else if (data) {
      // Insert aliases
      if (aliasesArr.length > 0) {
        const aliasInserts = aliasesArr.map((a) => ({
          library_item_id: (data as any).id,
          alias: a,
          normalized_alias: normalize(a),
        }));
        await supabase.from("meal_visual_aliases" as any).insert(aliasInserts);
      }
      toast.success("Refeição visual criada!");
      setCreateOpen(false);
      setForm({
        display_name: "", category: "cafe_da_manha", subcategory: "", short_description: "",
        base_recipe: "", default_portion: "", default_calories: "", default_protein: "",
        default_carbs: "", default_fat: "", image_url: "", tags: "",
      });
      setAliasInput("");
      fetchAll();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta refeição visual e todos os aliases?")) return;
    const { error } = await supabase.from("meal_visual_library" as any).delete().eq("id", id);
    if (error) toast.error("Erro: " + error.message);
    else { toast.success("Excluída."); fetchAll(); }
  };

  const getAliasCount = (itemId: string) => aliases.filter((a) => a.library_item_id === itemId).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-primary" /> Biblioteca Visual de Refeições
            </h1>
            <p className="text-muted-foreground text-sm">
              {items.length} refeições cadastradas · {aliases.length} aliases
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2 shadow-glow">
                <Plus className="w-4 h-4" /> Nova Refeição
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">Cadastrar Refeição Visual</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label>Nome de exibição *</Label>
                  <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Categoria *</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(MEAL_VISUAL_CATEGORIES).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subcategoria</Label>
                    <Input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Descrição curta</Label>
                  <Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
                </div>
                <div>
                  <Label>URL da imagem</Label>
                  <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Porção padrão</Label>
                    <Input value={form.default_portion} onChange={(e) => setForm({ ...form, default_portion: e.target.value })} />
                  </div>
                  <div>
                    <Label>Calorias</Label>
                    <Input type="number" value={form.default_calories} onChange={(e) => setForm({ ...form, default_calories: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Proteína (g)</Label>
                    <Input type="number" value={form.default_protein} onChange={(e) => setForm({ ...form, default_protein: e.target.value })} />
                  </div>
                  <div>
                    <Label>Carbs (g)</Label>
                    <Input type="number" value={form.default_carbs} onChange={(e) => setForm({ ...form, default_carbs: e.target.value })} />
                  </div>
                  <div>
                    <Label>Gordura (g)</Label>
                    <Input type="number" value={form.default_fat} onChange={(e) => setForm({ ...form, default_fat: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Receita / Modo de preparo</Label>
                  <Textarea value={form.base_recipe} onChange={(e) => setForm({ ...form, base_recipe: e.target.value })} rows={3} />
                </div>
                <div>
                  <Label>Tags (separadas por vírgula)</Label>
                  <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="proteico, rapido, fitness" />
                </div>
                <div>
                  <Label>Aliases (separados por vírgula)</Label>
                  <Input value={aliasInput} onChange={(e) => setAliasInput(e.target.value)} placeholder="pão com ovo, pao + ovo" />
                  <p className="text-[10px] text-muted-foreground mt-1">Nomes alternativos para associação automática</p>
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                  {submitting ? "Salvando..." : "Cadastrar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar refeição..."
              className="pl-9"
            />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {Object.entries(MEAL_VISUAL_CATEGORIES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-lg mb-1">Nenhuma refeição encontrada</h3>
            <p className="text-muted-foreground">Cadastre refeições visuais para enriquecer os planos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map((item) => (
              <div key={item.id} className="relative group/admin">
                <MealVisualCard item={item} onClick={() => setPreviewItem(item)} />
                {/* Admin overlay */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/admin:opacity-100 transition-opacity z-20">
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewItem(item); }}
                    className="p-1 rounded bg-background/80 backdrop-blur-sm hover:bg-primary/20 transition-colors"
                    title="Visualizar"
                  >
                    <Eye className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    className="p-1 rounded bg-background/80 backdrop-blur-sm hover:bg-destructive/20 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
                {/* Alias count */}
                <div className="absolute bottom-1 right-1">
                  <Badge variant="secondary" className="text-[8px] bg-background/60 backdrop-blur-sm">
                    <Link2 className="w-2.5 h-2.5 mr-0.5" />
                    {getAliasCount(item.id)} aliases
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <MealVisualModal
        open={!!previewItem}
        onOpenChange={(open) => { if (!open) setPreviewItem(null); }}
        item={previewItem}
      />
    </DashboardLayout>
  );
}
