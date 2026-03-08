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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { MessageSquare, Send, Clock, CheckCircle2, Reply, User } from "lucide-react";

interface Feedback {
  id: string;
  patient_id: string;
  nutritionist_id: string;
  message: string;
  response: string | null;
  is_anonymous: boolean;
  category: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  patient_name?: string;
}

// ──── NUTRITIONIST VIEW ────
function NutritionistFeedbacks() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [replyOpen, setReplyOpen] = useState(false);
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [response, setResponse] = useState("");
  const [filter, setFilter] = useState("all");

  const fetch = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("feedbacks")
      .select("*")
      .eq("nutritionist_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch patient names
      const patientIds = [...new Set(data.map(f => f.patient_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", patientIds);
      const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      setFeedbacks(data.map(f => ({ ...f, patient_name: f.is_anonymous ? "Anônimo" : nameMap.get(f.patient_id) || "Paciente" })));
    }
  };

  useEffect(() => { fetch(); }, [user]);

  const handleReply = async () => {
    if (!selected) return;
    const { error } = await supabase.from("feedbacks").update({
      response, status: "responded", responded_at: new Date().toISOString()
    }).eq("id", selected.id);
    if (error) toast.error(error.message);
    else { toast.success("Resposta enviada!"); setReplyOpen(false); setResponse(""); fetch(); }
  };

  const filtered = filter === "all" ? feedbacks : feedbacks.filter(f => f.status === filter);
  const pending = feedbacks.filter(f => f.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Feedbacks dos Pacientes</h1>
          <p className="text-sm text-muted-foreground">{pending} pendente{pending !== 1 ? "s" : ""}</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="responded">Respondidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="glass"><CardContent className="py-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum feedback encontrado.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(fb => (
            <motion.div key={fb.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{fb.patient_name}</span>
                        <Badge variant={fb.status === "pending" ? "destructive" : "secondary"} className="text-[10px]">
                          {fb.status === "pending" ? "Pendente" : "Respondido"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{fb.category}</Badge>
                      </div>
                      <p className="text-sm">{fb.message}</p>
                      {fb.response && (
                        <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/10 text-sm">
                          <span className="text-xs text-primary font-medium">Sua resposta:</span>
                          <p className="text-sm mt-0.5">{fb.response}</p>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {new Date(fb.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    {fb.status === "pending" && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => { setSelected(fb); setReplyOpen(true); }}>
                        <Reply className="w-3.5 h-3.5" /> Responder
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Responder Feedback</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted text-sm">{selected?.message}</div>
            <div>
              <Label>Sua resposta</Label>
              <Textarea value={response} onChange={e => setResponse(e.target.value)} rows={4} placeholder="Digite sua resposta..." />
            </div>
            <Button onClick={handleReply} className="w-full gradient-primary" disabled={!response.trim()}>
              <Send className="w-4 h-4 mr-2" /> Enviar Resposta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──── PATIENT VIEW ────
function PatientFeedbacks() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [nutritionistId, setNutritionistId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    // Get nutritionist
    const { data: np } = await supabase.from("nutritionist_patients").select("nutritionist_id").eq("patient_id", user.id).eq("status", "active").limit(1);
    if (np?.[0]) setNutritionistId(np[0].nutritionist_id);

    const { data } = await supabase.from("feedbacks").select("*").eq("patient_id", user.id).order("created_at", { ascending: false });
    setFeedbacks(data || []);
  };

  useEffect(() => { fetchData(); }, [user]);

  const sendFeedback = async () => {
    if (!user || !nutritionistId || !message.trim()) return;
    const { error } = await supabase.from("feedbacks").insert({
      patient_id: user.id, nutritionist_id: nutritionistId,
      message, category, is_anonymous: isAnonymous,
    });
    if (error) toast.error(error.message);
    else { toast.success("Feedback enviado!"); setMessage(""); fetchData(); }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Meus Feedbacks</h1>

      <Card className="glass border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base">Enviar Feedback</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral</SelectItem>
                  <SelectItem value="nutrition">Alimentação</SelectItem>
                  <SelectItem value="support">Suporte</SelectItem>
                  <SelectItem value="suggestion">Sugestão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="rounded" />
                <span className="text-sm">Enviar anônimo</span>
              </label>
            </div>
          </div>
          <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Escreva seu feedback..." rows={3} />
          <Button onClick={sendFeedback} className="w-full gradient-primary" disabled={!message.trim() || !nutritionistId}>
            <Send className="w-4 h-4 mr-2" /> Enviar
          </Button>
          {!nutritionistId && <p className="text-xs text-destructive">Você precisa estar vinculado a um nutricionista.</p>}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {feedbacks.map(fb => (
          <Card key={fb.id} className="glass border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px]">{fb.category}</Badge>
                {fb.status === "responded" ? (
                  <Badge className="text-[10px] bg-success/10 text-success"><CheckCircle2 className="w-3 h-3 mr-1" />Respondido</Badge>
                ) : (
                  <Badge className="text-[10px] bg-warning/10 text-warning"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>
                )}
              </div>
              <p className="text-sm">{fb.message}</p>
              {fb.response && (
                <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/10">
                  <span className="text-xs text-primary font-medium">Resposta do nutricionista:</span>
                  <p className="text-sm mt-0.5">{fb.response}</p>
                </div>
              )}
              <span className="text-xs text-muted-foreground mt-1 block">{new Date(fb.created_at).toLocaleDateString("pt-BR")}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Feedbacks() {
  const { isNutritionist } = useAuth();
  return (
    <DashboardLayout>
      {isNutritionist ? <NutritionistFeedbacks /> : <PatientFeedbacks />}
    </DashboardLayout>
  );
}
