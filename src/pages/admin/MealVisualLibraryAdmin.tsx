import { useEffect, useState, useMemo, useRef } from "react";
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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  BookOpen, Plus, Search, Filter, Image as ImageIcon, Trash2, Link2, Eye,
  RefreshCw, BarChart3, AlertTriangle, Loader2, Upload, CheckCircle2, XCircle, ImagePlus,
} from "lucide-react";
import MealVisualCard from "@/components/meals/MealVisualCard";
import MealVisualModal from "@/components/meals/MealVisualModal";
import { runAutoAssociation, type AssociationReport } from "@/lib/mealVisualAssociation";
import { batchUploadAndLink, type BatchUploadReport } from "@/lib/mealVisualBatchUpload";
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
  const [activeTab, setActiveTab] = useState("library");
  const [auditReport, setAuditReport] = useState<AssociationReport | null>(null);
  const [auditRunning, setAuditRunning] = useState(false);
  const [uploadReport, setUploadReport] = useState<BatchUploadReport | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    display_name: "", category: "cafe_da_manha", subcategory: "", short_description: "",
    base_recipe: "", default_portion: "", default_calories: "", default_protein: "",
    default_carbs: "", default_fat: "", image_url: "", tags: "",
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

  // Coverage stats
  const coverageStats = useMemo(() => {
    const withImage = items.filter((i) => i.image_url || i.image_path).length;
    const withoutImage = items.length - withImage;
    const pct = items.length > 0 ? Math.round((withImage / items.length) * 100) : 0;
    return { withImage, withoutImage, pct, total: items.length };
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (filterCat === "no_image") return result.filter((i) => !i.image_url && !i.image_path);
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
      slug, name: slug, display_name: form.display_name, category: form.category,
      subcategory: form.subcategory || null, short_description: form.short_description || null,
      base_recipe: form.base_recipe || null, default_portion: form.default_portion || null,
      default_calories: form.default_calories ? Number(form.default_calories) : null,
      default_protein: form.default_protein ? Number(form.default_protein) : null,
      default_carbs: form.default_carbs ? Number(form.default_carbs) : null,
      default_fat: form.default_fat ? Number(form.default_fat) : null,
      image_url: form.image_url || null, tags: tagsArr, search_terms: tagsArr,
      created_by: user?.id, ...getTenantIdForInsert(tenantId),
    };

    const { data, error } = await supabase.from("meal_visual_library" as any).insert(payload).select().single();
    if (error) {
      toast.error("Erro: " + error.message);
    } else if (data) {
      if (aliasesArr.length > 0) {
        const aliasInserts = aliasesArr.map((a) => ({
          library_item_id: (data as any).id, alias: a, normalized_alias: normalize(a),
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

  const handleRunAssociation = async () => {
    setAuditRunning(true);
    try {
      const report = await runAutoAssociation();
      setAuditReport(report);
      toast.success(`Associação concluída! ${report.totalLinked} itens vinculados.`);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
    setAuditRunning(false);
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadReport(null);
    try {
      const report = await batchUploadAndLink(Array.from(files), tenantId, user?.id || null);
      setUploadReport(report);
      toast.success(`Upload concluído! ${report.linked} vinculados, ${report.created} criados.`);
      fetchAll();
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
              {items.length} refeições · {aliases.length} aliases
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleBatchUpload}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload em Lote
            </Button>
            <Button variant="outline" onClick={handleRunAssociation} disabled={auditRunning} className="gap-2">
              {auditRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Vincular Automaticamente
            </Button>
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
                  <div><Label>Descrição curta</Label><Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} /></div>
                  <div><Label>URL da imagem</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Porção padrão</Label><Input value={form.default_portion} onChange={(e) => setForm({ ...form, default_portion: e.target.value })} /></div>
                    <div><Label>Calorias</Label><Input type="number" value={form.default_calories} onChange={(e) => setForm({ ...form, default_calories: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Proteína (g)</Label><Input type="number" value={form.default_protein} onChange={(e) => setForm({ ...form, default_protein: e.target.value })} /></div>
                    <div><Label>Carbs (g)</Label><Input type="number" value={form.default_carbs} onChange={(e) => setForm({ ...form, default_carbs: e.target.value })} /></div>
                    <div><Label>Gordura (g)</Label><Input type="number" value={form.default_fat} onChange={(e) => setForm({ ...form, default_fat: e.target.value })} /></div>
                  </div>
                  <div><Label>Receita / Modo de preparo</Label><Textarea value={form.base_recipe} onChange={(e) => setForm({ ...form, base_recipe: e.target.value })} rows={3} /></div>
                  <div><Label>Tags (separadas por vírgula)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="proteico, rapido, fitness" /></div>
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
        </div>

        {/* Coverage Bar */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Cobertura de Imagens</span>
            </div>
            <span className="text-sm font-bold text-primary">{coverageStats.pct}%</span>
          </div>
          <Progress value={coverageStats.pct} className="h-2" />
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {coverageStats.withImage} com imagem</span>
            <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> {coverageStats.withoutImage} sem imagem</span>
          </div>
        </div>

        {/* Upload Report */}
        {uploadReport && (
          <div className="glass rounded-xl p-4 border border-primary/20">
            <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <Upload className="w-4 h-4 text-primary" /> Relatório do Upload em Lote
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="text-center"><p className="text-lg font-bold">{uploadReport.processed}</p><p className="text-[10px] text-muted-foreground">Processados</p></div>
              <div className="text-center"><p className="text-lg font-bold text-emerald-500">{uploadReport.linked}</p><p className="text-[10px] text-muted-foreground">Vinculados</p></div>
              <div className="text-center"><p className="text-lg font-bold text-blue-500">{uploadReport.created}</p><p className="text-[10px] text-muted-foreground">Criados</p></div>
              <div className="text-center"><p className="text-lg font-bold text-amber-500">{uploadReport.unrecognized.length}</p><p className="text-[10px] text-muted-foreground">Erros</p></div>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {uploadReport.details.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-secondary/30 rounded px-3 py-1.5">
                  <span className="truncate flex-1">{d.fileName}</span>
                  <Badge variant={d.status.startsWith("Erro") ? "destructive" : "secondary"} className="text-[9px] ml-2">
                    {d.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="library" className="gap-1.5"><BookOpen className="w-4 h-4" /> Biblioteca</TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5"><BarChart3 className="w-4 h-4" /> Auditoria Visual</TabsTrigger>
          </TabsList>

          {/* LIBRARY TAB */}
          <TabsContent value="library" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar refeição..." className="pl-9" />
              </div>
              <Select value={filterCat} onValueChange={setFilterCat}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  <SelectItem value="no_image">❌ Sem imagem</SelectItem>
                  {Object.entries(MEAL_VISUAL_CATEGORIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                    {/* Image indicator */}
                    {(item.image_url || item.image_path) ? (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/80 flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center">
                          <XCircle className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                    {/* Gallery count */}
                    {item.gallery_images && item.gallery_images.length > 0 && (
                      <div className="absolute top-2 right-8 z-10">
                        <Badge variant="secondary" className="text-[8px] bg-background/70 backdrop-blur-sm">
                          +{item.gallery_images.length}
                        </Badge>
                      </div>
                    )}
                    {/* Admin actions */}
                    <div className="absolute bottom-1 left-1 flex gap-1 opacity-0 group-hover/admin:opacity-100 transition-opacity z-20">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPreviewItem(item); }}
                        className="p-1 rounded bg-background/80 backdrop-blur-sm hover:bg-primary/20 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-foreground" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        className="p-1 rounded bg-background/80 backdrop-blur-sm hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                    <div className="absolute bottom-1 right-1">
                      <Badge variant="secondary" className="text-[8px] bg-background/60 backdrop-blur-sm">
                        <Link2 className="w-2.5 h-2.5 mr-0.5" />{getAliasCount(item.id)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* AUDIT TAB */}
          <TabsContent value="audit" className="space-y-4 mt-4">
            {!auditReport ? (
              <div className="glass rounded-xl p-12 text-center">
                <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-display font-semibold text-lg mb-2">Auditoria de Cobertura Visual</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Analise quais itens de plano e templates estão vinculados à biblioteca visual.
                </p>
                <Button onClick={handleRunAssociation} disabled={auditRunning} className="gradient-primary gap-2">
                  {auditRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Executar Análise e Auto-Associação
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{auditReport.totalAnalyzed}</p>
                    <p className="text-xs text-muted-foreground">Itens analisados</p>
                  </div>
                  <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-500">{auditReport.totalLinked + auditReport.totalAlreadyLinked}</p>
                    <p className="text-xs text-muted-foreground">Com vínculo visual</p>
                  </div>
                  <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-amber-500">{auditReport.totalLinked}</p>
                    <p className="text-xs text-muted-foreground">Novos vinculados agora</p>
                  </div>
                  <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-red-500">{auditReport.totalUnlinked}</p>
                    <p className="text-xs text-muted-foreground">Sem vínculo</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="glass rounded-xl p-4">
                    <h4 className="font-semibold text-sm mb-2">🍽️ Itens de Plano</h4>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Analisados: {auditReport.details.mealPlanItems.analyzed}</p>
                      <p className="text-emerald-500">Vinculados: {auditReport.details.mealPlanItems.linked}</p>
                      <p>Já vinculados: {auditReport.details.mealPlanItems.skipped}</p>
                    </div>
                  </div>
                  <div className="glass rounded-xl p-4">
                    <h4 className="font-semibold text-sm mb-2">📋 Refeições Salvas</h4>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Analisados: {auditReport.details.savedMeals.analyzed}</p>
                      <p className="text-emerald-500">Vinculados: {auditReport.details.savedMeals.linked}</p>
                      <p>Já vinculados: {auditReport.details.savedMeals.skipped}</p>
                    </div>
                  </div>
                </div>

                {auditReport.topUnrecognized.length > 0 && (
                  <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <h4 className="font-semibold text-sm">Top Itens Não Reconhecidos</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Cadastre aliases na biblioteca para vincular esses nomes automaticamente.
                    </p>
                    <div className="space-y-1.5">
                      {auditReport.topUnrecognized.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-secondary/40 rounded-lg px-3 py-2">
                          <span className="truncate flex-1">{item.name || "(vazio)"}</span>
                          <Badge variant="outline" className="text-[9px] ml-2">{item.count}×</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={handleRunAssociation} disabled={auditRunning} variant="outline" className="gap-2">
                  {auditRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Executar Novamente
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
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
