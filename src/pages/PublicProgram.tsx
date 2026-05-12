import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Rocket, Users, Calendar, Loader2, Send, CheckCircle2 } from "lucide-react";

export default function PublicProgram() {
  const { programId } = useParams<{ programId: string }>();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");

  const [program, setProgram] = useState<any>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!programId) return;
    (async () => {
      const [progRes, phasesRes, enrolledRes] = await Promise.all([
        supabase.from("programs").select("*").eq("id", programId).eq("is_active", true).maybeSingle(),
        supabase.from("program_phases").select("*").eq("program_id", programId).order("phase_number"),
        supabase.from("program_patients").select("id", { count: "exact", head: true }).eq("program_id", programId).eq("status", "active"),
      ]);
      setProgram(progRes.data);
      setPhases(phasesRes.data || []);
      setEnrolledCount(enrolledRes.count || 0);
      setLoading(false);

      // Track referral click
      if (referralCode) {
        await supabase.from("patient_referrals").update({ clicks: enrolledRes.count || 0 }).eq("referral_code", referralCode);
      }
    })();
  }, [programId, referralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !formData.name.trim() || !formData.email.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("lead_requests").insert({
      nutritionist_id: program.created_by,
      program_id: program.id,
      referral_code: referralCode || null,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || null,
      message: formData.message.trim() || `Interesse no programa: ${program.title}`,
      source: referralCode ? "referral" : "program",
    });
    setSubmitting(false);
    if (error) { toast.error("Erro ao enviar. Tente novamente."); return; }
    toast.success("Interesse registrado com sucesso!");
    setShowForm(false);
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!program) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Programa não encontrado</h1>
        <p className="text-muted-foreground">Este programa não está disponível publicamente.</p>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{program.title} — FitJourney</title>
        <meta name="description" content={program.description || `Programa ${program.title}`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-primary/20 via-background to-accent/10 py-16 px-4">
          {program.image_url && (
            <div className="absolute inset-0 opacity-10">
              <img src={program.image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto text-center relative z-10">
            <Badge className="mb-4">{program.tag}</Badge>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">{program.title}</h1>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed mb-6">{program.description}</p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {enrolledCount} participantes</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {phases.length} fases</span>
            </div>
            <Button onClick={() => setShowForm(true)} className="gradient-primary shadow-glow gap-2" size="lg">
              <Rocket className="w-5 h-5" /> Quero Participar
            </Button>
          </motion.div>
        </div>

        {/* Phases */}
        {phases.length > 0 && (
          <div className="max-w-3xl mx-auto px-4 py-12">
            <h2 className="font-display text-2xl font-bold mb-6 text-center">Fases do Programa</h2>
            <div className="space-y-4">
              {phases.map((phase, i) => (
                <motion.div key={phase.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className="hover:border-primary/30 transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-display font-bold text-primary">
                          {phase.phase_number}
                        </div>
                        <div>
                          <h3 className="font-semibold">{phase.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{phase.objective || `Duração: ${phase.duration_weeks} semanas`}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Lead Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <h3 className="font-display font-bold text-lg mb-1">Quero Participar</h3>
              <p className="text-sm text-muted-foreground mb-4">Deixe seus dados e entraremos em contato.</p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input placeholder="Seu nome *" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required maxLength={200} />
                <Input type="email" placeholder="Seu e-mail *" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} required maxLength={320} />
                <Input placeholder="Telefone (opcional)" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} maxLength={20} />
                <Textarea placeholder="Mensagem (opcional)" value={formData.message} onChange={e => setFormData(p => ({ ...p, message: e.target.value }))} rows={3} maxLength={2000} />
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1 gradient-primary gap-2" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Enviar
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
}
