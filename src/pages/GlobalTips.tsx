import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Lightbulb, Plus, Pencil, Trash2 } from "lucide-react";

interface Tip {
  id: string;
  title: string;
  content: string;
  category: string;
  icon: string;
  is_published: boolean;
  created_at: string;
}

const categories = [
  { value: "nutrition", label: "Nutrição", icon: "🥗" },
  { value: "hydration", label: "Hidratação", icon: "💧" },
  { value: "exercise", label: "Exercício", icon: "🏃" },
  { value: "sleep", label: "Sono", icon: "😴" },
  { value: "mindset", label: "Mindset", icon: "🧠" },
  { value: "general", label: "Geral", icon: "💡" },
];

const emptyForm = { title: "", content: "", category: "nutrition", icon: "💡" };

// ──── NUTRITIONIST: Create/manage tips ────
function NutritionistTips() {
  const { user } = useAuth();
  const [tips, setTips] = useState<Tip[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tip | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchTips = async () => {
    if (!user) return;
    const { data } = await supabase.from("global_tips").select("*").eq("nutritionist_id", user.id).order("created_at", { ascending: false });
    setTips(data || []);
  };

  useEffect(() => { fetchTips(); }, [user]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (t: Tip) => { setEditing(t); setForm({ title: t.title, content: t.content, category: t.category, icon: t.icon }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!user || !form.title.trim()) return;
    const icon = categories.find(c => c.value === form.category)?.icon || "💡";
    const payload = { ...form, icon, nutritionist_id: user.id };

    if (editing) {
      const { error } = await supabase.from("global_tips").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message); else toast.success("Dica atualizada!");
    } else {
      const { error } = await supabase.from("global_tips").insert(payload);
      if (error) toast.error(error.message); else toast.success("Dica publicada!");
    }
    setDialogOpen(false); fetchTips();
  };

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from("global_tips").update({ is_published: !current }).eq("id", id);
    fetchTips();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta dica?")) return;
    await supabase.from("global_tips").delete().eq("id", id);
    toast.success("Dica removida!"); fetchTips();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Dicas Globais</h1>
        <Button onClick={openNew} className="gradient-primary gap-2"><Plus className="w-4 h-4" /> Nova Dica</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tips.map(tip => (
          <motion.div key={tip.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass border-border h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{tip.icon}</span>
                    <div>
                      <h3 className="font-medium text-sm">{tip.title}</h3>
                      <Badge variant="outline" className="text-[10px] mt-0.5">{tip.category}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={tip.is_published} onCheckedChange={() => togglePublish(tip.id, tip.is_published)} />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(tip)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(tip.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{tip.content}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{editing ? "Editar Dica" : "Nova Dica"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Beba água ao acordar" /></div>
            <div><Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Conteúdo</Label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} placeholder="Escreva a dica completa..." /></div>
            <Button onClick={handleSave} className="w-full gradient-primary" disabled={!form.title.trim() || !form.content.trim()}>
              {editing ? "Atualizar" : "Publicar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──── PATIENT: View tips ────
function PatientTips() {
  const [tips, setTips] = useState<Tip[]>([]);

  useEffect(() => {
    supabase.from("global_tips").select("*").eq("is_published", true).order("created_at", { ascending: false })
      .then(({ data }) => setTips(data || []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Lightbulb className="w-6 h-6 text-warning" /> Dicas do Nutricionista</h1>
      {tips.length === 0 ? (
        <Card className="glass"><CardContent className="py-12 text-center">
          <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma dica publicada ainda.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tips.map(tip => (
            <motion.div key={tip.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass border-border h-full hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{tip.icon}</span>
                    <div>
                      <h3 className="font-display font-semibold">{tip.title}</h3>
                      <Badge variant="outline" className="text-[10px]">{categories.find(c => c.value === tip.category)?.label || tip.category}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{tip.content}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GlobalTips() {
  const { isNutritionist } = useAuth();
  return <DashboardLayout>{isNutritionist ? <NutritionistTips /> : <PatientTips />}</DashboardLayout>;
}
