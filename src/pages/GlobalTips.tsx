/**
 * GlobalTips.tsx
 * Dicas Globais - Sistema de Smart Tips premium
 * Nutricionista: cria/edita/remove/semeia dicas com categorias e destaques
 * Paciente: visualiza com filtros por categoria e dicas em destaque
 */
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb, Plus, Pencil, Trash2, Star, Apple,
  Droplets, Dumbbell, Moon, Brain, Sparkles,
  Search, ShieldCheck, RefreshCw
} from "lucide-react";

// ─── Tipos ─────────────────────────────────────────────

interface Tip {
  id: string;
  title: string;
  content: string;
  category: string;
  icon: string;
  is_published: boolean;
  is_featured?: boolean;
  nutritionist_id?: string;
  created_at: string;
}

// ─── Categorias ────────────────────────────────────────

const CATEGORIES = [
  { id: "all", label: "Todas", icon: "💡", lucide: Lightbulb, color: "from-violet-500 to-purple-600" },
  { id: "nutrition", label: "Nutrição", icon: "🥗", lucide: Apple, color: "from-green-500 to-emerald-600" },
  { id: "hydration", label: "Hidratação", icon: "💧", lucide: Droplets, color: "from-blue-500 to-cyan-600" },
  { id: "exercise", label: "Exercício", icon: "🏃", lucide: Dumbbell, color: "from-orange-500 to-amber-600" },
  { id: "sleep", label: "Sono", icon: "😴", lucide: Moon, color: "from-indigo-500 to-blue-600" },
  { id: "mindset", label: "Mindset", icon: "🧠", lucide: Brain, color: "from-pink-500 to-rose-600" },
  { id: "general", label: "Geral", icon: "✨", lucide: Sparkles, color: "from-teal-500 to-cyan-600" },
];

// ─── Dicas padrão (seed) ─────────────────────────────

const DEFAULT_TIPS: Omit<Tip, "id" | "created_at">[] = [
  { title: "Beba água ao acordar", content: "Beba um copo de água logo ao acordar para hidratar o organismo e ativar o metabolismo.", category: "hydration", icon: "💧", is_published: true },
  { title: "Mastigue devagar", content: "Mastigue cada garfada pelo menos 20 vezes. Comer devagar ativa a saciedade e melhora a digestão.", category: "nutrition", icon: "🥗", is_published: true, is_featured: true },
  { title: "Evite glicídios em excesso", content: "Diminua o consumo de açúcares simples. Eles são responsáveis pelo aumento do peso corporal.", category: "nutrition", icon: "🚫", is_published: true },
  { title: "Não pule o café da manhã", content: "O café da manhã é a refeição mais importante do dia. Pular contribui para comer em excesso no almoço.", category: "nutrition", icon: "🌅", is_published: true },
  { title: "Durma pelo menos 7h", content: "A privação do sono aumenta o hormônio da fome. Durma entre 7 e 9 horas por noite.", category: "sleep", icon: "😴", is_published: true, is_featured: true },
  { title: "Movimente-se todo dia", content: "Pelo menos 30 minutos de atividade física moderada por dia fazem diferença significativa nos resultados.", category: "exercise", icon: "🏃", is_published: true },
  { title: "Celebre pequenas conquistas", content: "Cada passo em direção ao seu objetivo é uma vitória. Reconheça seu progresso e mantenha a motivação.", category: "mindset", icon: "🎉", is_published: true, is_featured: true },
  { title: "Evite frituras", content: "Prefira alimentos assados, grelhados ou cozidos. As frituras aumentam o teor calórico e prejudicam a saúde.", category: "nutrition", icon: "🥦", is_published: true },
  { title: "Não pule o lanche da tarde", content: "O lanche da tarde evita que você chegue com muita fome no jantar e exagere nas porções.", category: "nutrition", icon: "🍎", is_published: true },
  { title: "Construa hábitos, não restrições", content: "Foque em criar novos hábitos saudáveis em vez de focar no que você não pode comer.", category: "mindset", icon: "💪", is_published: true },
];

const emptyForm = { title: "", content: "", category: "nutrition", icon: "💡", is_featured: false };

// ─── Nutritionist Component ───────────────────────────

function NutritionistTips() {
  const { user } = useAuth();
  const [tips, setTips] = useState<Tip[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tip | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [seeding, setSeeding] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTips = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("global_tips")
      .select("*")
      .eq("nutritionist_id", user.id)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    setTips(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTips(); }, [fetchTips]);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const openEdit = (t: Tip) => {
    setEditing(t);
    setForm({ title: t.title, content: t.content, category: t.category, icon: t.icon, is_featured: t.is_featured || false });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.title.trim() || !form.content.trim()) return;
    const icon = CATEGORIES.find(c => c.id === form.category)?.icon || "💡";
    const payload = { ...form, icon, nutritionist_id: user.id };
    if (editing) {
      const { error } = await supabase.from("global_tips").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message); else toast.success("Dica atualizada!");
    } else {
      const { error } = await supabase.from("global_tips").insert(payload);
      if (error) toast.error(error.message); else toast.success("Dica publicada! ✨");
    }
    setDialogOpen(false);
    fetchTips();
  };

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from("global_tips").update({ is_published: !current }).eq("id", id);
    fetchTips();
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    await supabase.from("global_tips").update({ is_featured: !current }).eq("id", id);
    fetchTips();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta dica?")) return;
    await supabase.from("global_tips").delete().eq("id", id);
    toast.success("Dica removida!"); fetchTips();
  };

  const seedDefaultTips = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const existing = await supabase.from("global_tips").select("title").eq("nutritionist_id", user.id);
      const existingTitles = new Set((existing.data || []).map((t: any) => t.title));
      const toInsert = DEFAULT_TIPS.filter(t => !existingTitles.has(t.title)).map(t => ({ ...t, nutritionist_id: user.id }));
      if (toInsert.length === 0) { toast.info("Todas as dicas padrão já existem!"); return; }
      await supabase.from("global_tips").insert(toInsert);
      toast.success(`${toInsert.length} dicas padrão adicionadas! 🌱`);
      fetchTips();
    } catch { toast.error("Erro ao importar dicas"); }
    finally { setSeeding(false); }
  };

  const filtered = tips.filter(t => {
    const matchCat = activeCategory === "all" || t.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const featured = filtered.filter(t => t.is_featured && t.is_published);
  const rest = filtered.filter(t => !t.is_featured);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-24 translate-x-24 blur-2xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Dicas Globais</h1>
              <p className="text-white/70 text-sm">{tips.filter(t => t.is_published).length} publicadas · {tips.filter(t => t.is_featured).length} em destaque</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={seedDefaultTips}
              disabled={seeding}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs"
            >
              {seeding ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1" />}
              Importar dicas padrão
            </Button>
            <Button onClick={openNew} className="bg-white text-violet-700 hover:bg-white/90 font-bold text-sm">
              <Plus className="w-4 h-4 mr-1" /> Nova Dica
            </Button>
          </div>
        </div>
      </div>

      {/* Search + Category Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar dicas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all
                ${activeCategory === cat.id ? `bg-gradient-to-r ${cat.color} text-white shadow-md` : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              <span>{cat.icon}</span>{cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Tips */}
      {featured.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-500" />
            <h2 className="font-bold text-gray-800 text-sm">Em Destaque</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {featured.map(tip => (
              <TipCard key={tip.id} tip={tip} isAdmin onTogglePublish={togglePublish} onToggleFeatured={toggleFeatured} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* All Tips */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : rest.length === 0 && featured.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhuma dica encontrada.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={seedDefaultTips}>
            Importar dicas padrão
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AnimatePresence>
            {rest.map(tip => (
              <TipCard key={tip.id} tip={tip} isAdmin onTogglePublish={togglePublish} onToggleFeatured={toggleFeatured} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Dica" : "Nova Dica"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Beba água ao acordar" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter(c => c.id !== "all").map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.icon} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} placeholder="Escreva a dica completa..." />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_featured} onCheckedChange={v => setForm({ ...form, is_featured: v })} />
              <Label className="cursor-pointer">Marcar como destaque ⭐</Label>
            </div>
            <Button onClick={handleSave} className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white"
              disabled={!form.title.trim() || !form.content.trim()}>
              {editing ? "Atualizar" : "Publicar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tip Card Component ───────────────────────────────

interface TipCardProps {
  tip: Tip;
  isAdmin?: boolean;
  onTogglePublish?: (id: string, current: boolean) => void;
  onToggleFeatured?: (id: string, current: boolean) => void;
  onEdit?: (tip: Tip) => void;
  onDelete?: (id: string) => void;
}

function TipCard({ tip, isAdmin, onTogglePublish, onToggleFeatured, onEdit, onDelete }: TipCardProps) {
  const cat = CATEGORIES.find(c => c.id === tip.category);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className={`h-full transition-all border ${tip.is_featured && tip.is_published ? "border-amber-300 bg-amber-50/30" : "border-gray-100 hover:border-violet-200 hover:shadow-md"}`}>
        {tip.is_featured && tip.is_published && (
          <div className="h-0.5 bg-gradient-to-r from-amber-400 to-orange-400 rounded-t-lg" />
        )}
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 flex-1">
              <span className="text-2xl flex-shrink-0">{tip.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{tip.title}</h3>
                  {tip.is_featured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                </div>
                <Badge className={`text-[10px] px-1.5 py-0 border-0 bg-gradient-to-r ${cat?.color || "from-gray-400 to-gray-500"} text-white`}>
                  {cat?.icon} {cat?.label || tip.category}
                </Badge>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{tip.content}</p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-1" title="Publicar/Ocultar">
                  <Switch checked={tip.is_published} onCheckedChange={() => onTogglePublish?.(tip.id, tip.is_published)} className="data-[state=checked]:bg-emerald-500 scale-75" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => onToggleFeatured?.(tip.id, tip.is_featured || false)} title="Destaque"
                    className={`p-1 rounded transition-colors ${tip.is_featured ? "text-amber-500 hover:text-amber-600" : "text-gray-300 hover:text-amber-400"}`}>
                    <Star className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onEdit?.(tip)} className="p-1 rounded text-gray-400 hover:text-violet-600 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete?.(tip.id)} className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Patient Component ────────────────────────────────

function PatientTips() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("global_tips")
      .select("*")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => setTips(data || []));
  }, []);

  const filtered = tips.filter(t => {
    const matchCat = activeCategory === "all" || t.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const featured = filtered.filter(t => t.is_featured);
  const rest = filtered.filter(t => !t.is_featured);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-24 translate-x-24 blur-2xl" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Dicas do Nutricionista</h1>
            <p className="text-white/80 text-sm">{tips.length} dicas disponíveis para você</p>
          </div>
        </div>
      </div>

      {/* Search + Categories */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar dicas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all
                ${activeCategory === cat.id ? `bg-gradient-to-r ${cat.color} text-white shadow-md` : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              <span>{cat.icon}</span>{cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h2 className="font-bold text-gray-800 text-sm">Destaques</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {featured.map(tip => <TipCard key={tip.id} tip={tip} />)}
          </div>
        </div>
      )}

      {/* Rest */}
      {tips.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhuma dica disponível ainda.</p>
        </div>
      ) : rest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rest.map(tip => <TipCard key={tip.id} tip={tip} />)}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────

export default function GlobalTips() {
  const { isNutritionist } = useAuth();
  return (
    <DashboardLayout>
      {isNutritionist ? <NutritionistTips /> : <PatientTips />}
    </DashboardLayout>
  );
}
