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
import { MessageSquare, Send, Clock, CheckCircle2, Reply, User, Star, Award } from "lucide-react";

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
                      <Button size="sm" variant="outline" onClick={() => { setSelected(fb); setReplyOpen(true); }}>
                        <Reply className="w-4 h-4" />
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
          <DialogHeader><DialogTitle>Responder Feedback</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded bg-muted/50 text-sm">{selected?.message}</div>
            <div>
              <Label>Sua Resposta</Label>
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
  const { user, profile } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [nutritionistId, setNutritionistId] = useState<string | null>(null);

  // Testimonial state
  const [testimonialContent, setTestimonialContent] = useState("");
  const [testimonialRating, setTestimonialRating] = useState(5);
  const [testimonialAnonymous, setTestimonialAnonymous] = useState(false);
  const [myTestimonials, setMyTestimonials] = useState<any[]>([]);
  const [submittingTestimonial, setSubmittingTestimonial] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const { data: np } = await supabase.from("nutritionist_patients").select("nutritionist_id").eq("patient_id", user.id).eq("status", "active").limit(1);
    if (np?.[0]) setNutritionistId(np[0].nutritionist_id);

    const { data } = await supabase.from("feedbacks").select("*").eq("patient_id", user.id).order("created_at", { ascending: false });
    setFeedbacks(data || []);

    const { data: tData } = await supabase.from("testimonials").select("*").eq("patient_id", user.id).order("created_at", { ascending: false });
    setMyTestimonials(tData || []);
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

  const sendTestimonial = async () => {
    if (!user || !testimonialContent.trim()) return;
    setSubmittingTestimonial(true);
    const { error } = await supabase.from("testimonials").insert({
      patient_id: user.id,
      content: testimonialContent.trim(),
      rating: testimonialRating,
      is_anonymous: testimonialAnonymous,
      display_name: testimonialAnonymous ? "Anônimo" : (profile?.full_name || "Paciente"),
      status: "pending",
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Depoimento enviado para aprovação! ✨");
      setTestimonialContent("");
      setTestimonialRating(5);
      fetchData();
    }
    setSubmittingTestimonial(false);
  };

  const testimonialStatusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-success/10 text-success border-0 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" />Aprovado</Badge>;
    if (status === "rejected") return <Badge variant="destructive" className="text-[10px]">Rejeitado</Badge>;
    return <Badge variant="secondary" className="text-[10px]"><Clock className="w-3 h-3 mr-1" />Em análise</Badge>;
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Feedbacks & Depoimentos</h1>

      {/* ── Testimonial Section ── */}
      <Card className="glass border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-5 h-5 text-accent" /> Deixe seu Depoimento
          </CardTitle>
          <p className="text-xs text-muted-foreground">Compartilhe sua experiência! Depoimentos aprovados aparecem no site.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Avaliação:</Label>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setTestimonialRating(s)} className="p-0.5">
                  <Star className={`w-5 h-5 transition-colors ${s <= testimonialRating ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
              <input type="checkbox" checked={testimonialAnonymous} onChange={e => setTestimonialAnonymous(e.target.checked)} className="rounded" />
              <span className="text-xs text-muted-foreground">Anônimo</span>
            </label>
          </div>
          <Textarea
            value={testimonialContent}
            onChange={e => setTestimonialContent(e.target.value)}
            placeholder="Como o FitJourney e seu nutricionista ajudaram você? Conte sua experiência..."
            rows={3}
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{testimonialContent.length}/500</span>
            <Button onClick={sendTestimonial} disabled={!testimonialContent.trim() || submittingTestimonial} size="sm" className="gradient-primary gap-1.5">
              <Award className="w-3.5 h-3.5" /> Enviar Depoimento
            </Button>
          </div>

          {myTestimonials.length > 0 && (
            <div className="pt-3 border-t border-border/50 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Seus depoimentos:</p>
              {myTestimonials.map(t => (
                <div key={t.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                  <div className="flex gap-0.5 shrink-0 mt-0.5">
                    {Array.from({ length: t.rating || 5 }, (_, i) => (
                      <Star key={i} className="w-3 h-3 fill-accent text-accent" />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{t.content}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {testimonialStatusBadge(t.status)}
                      <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Feedback to Nutritionist ── */}
      <Card className="glass border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base">Enviar Feedback ao Nutricionista</CardTitle></CardHeader>
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
