import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  User, Star, Calendar, MessageSquare, Rocket, CheckCircle2,
  Loader2, Send, MapPin, Award, CreditCard, Briefcase
} from "lucide-react";

interface PublicProfile {
  id: string;
  nutritionist_id: string;
  slug: string;
  bio: string;
  specialties: string[];
  booking_enabled: boolean;
}

interface ProfileData {
  full_name: string;
  avatar_url: string | null;
}

interface ProgramData {
  id: string;
  title: string;
  description: string | null;
  tag: string;
  image_url: string | null;
}

export default function PublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [programs, setPrograms] = useState<ProgramData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Lead form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: pub } = await supabase
        .from("public_profile_settings")
        .select("*")
        .eq("slug", slug)
        .eq("is_public", true)
        .maybeSingle();

      if (!pub) { setNotFound(true); setLoading(false); return; }
      setProfile(pub as PublicProfile);

      const [profileRes, programsRes] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("user_id", pub.nutritionist_id).maybeSingle(),
        supabase.from("programs").select("id, title, description, tag, image_url").eq("created_by", pub.nutritionist_id).eq("is_active", true),
      ]);

      setProfileData(profileRes.data as ProfileData | null);
      setPrograms((programsRes.data || []) as ProgramData[]);
      setLoading(false);
    })();
  }, [slug]);

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !formData.name.trim() || !formData.email.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("lead_requests").insert({
      nutritionist_id: profile.nutritionist_id,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || null,
      message: formData.message.trim() || null,
      source: "profile",
    });
    setSubmitting(false);
    if (error) { toast.error("Erro ao enviar. Tente novamente."); return; }
    toast.success("Solicitação enviada com sucesso!");
    setShowForm(false);
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (notFound || !profile) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Perfil não encontrado</h1>
        <p className="text-muted-foreground">Este profissional não possui um perfil público.</p>
      </div>
    </div>
  );

  const name = profileData?.full_name || "Nutricionista";

  return (
    <>
      <Helmet>
        <title>{name} — Nutricionista | FitJourney</title>
        <meta name="description" content={profile.bio || `Perfil profissional de ${name}`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary/20 via-background to-accent/10 py-16 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 border-2 border-primary/30">
              {profileData?.avatar_url ? (
                <img src={profileData.avatar_url} alt={name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-primary" />
              )}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">{name}</h1>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Award className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Nutricionista</span>
            </div>
            {profile.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {profile.specialties.map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            )}
            {profile.bio && (
              <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">{profile.bio}</p>
            )}
            {profile.booking_enabled && (
              <Button
                onClick={() => setShowForm(true)}
                className="mt-6 gradient-primary shadow-glow gap-2"
                size="lg"
              >
                <Calendar className="w-5 h-5" /> Solicitar Consulta
              </Button>
            )}
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => navigate(`/p/${slug}/paciente`)}
              >
                <CreditCard className="w-5 h-5" /> Planos para Pacientes
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => navigate(`/p/${slug}/profissional`)}
              >
                <Briefcase className="w-5 h-5" /> Planos para Profissionais
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Programs */}
        {programs.length > 0 && (
          <div className="max-w-4xl mx-auto px-4 py-12">
            <h2 className="font-display text-2xl font-bold mb-6 text-center">Programas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {programs.map((prog) => (
                <Card key={prog.id} className="overflow-hidden hover:border-primary/30 transition-all">
                  {prog.image_url && (
                    <div className="h-40 bg-muted overflow-hidden">
                      <img src={prog.image_url} alt={prog.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-primary" />
                      <CardTitle className="text-lg">{prog.title}</CardTitle>
                    </div>
                    <Badge variant="outline" className="w-fit text-xs">{prog.tag}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">{prog.description || "Programa de acompanhamento nutricional."}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-2"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, message: `Interesse no programa: ${prog.title}` }));
                        setShowForm(true);
                      }}
                    >
                      <MessageSquare className="w-3 h-3" /> Saber mais
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Lead Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-display font-bold text-lg mb-1">Solicitar Consulta</h3>
              <p className="text-sm text-muted-foreground mb-4">Preencha seus dados para entrar em contato com {name}.</p>
              <form onSubmit={handleSubmitLead} className="space-y-3">
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
