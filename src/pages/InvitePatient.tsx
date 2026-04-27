import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PRODUCTION_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, UserPlus, Mail, Key, Copy, Check, MessageCircle, Send, LinkIcon, Zap, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import SubscriptionGuard from "@/components/common/SubscriptionGuard";
import { validateWhatsApp, normalizeWhatsApp, formatInternationalWhatsApp } from "@/utils/whatsapp";
import { getWhatsAppInvitationMessage, WhatsAppTemplateType, getInvitationUrl, getQuickLinkUrl, getOnboardingUrl } from "@/utils/invitation";
import { useWhatsAppTemplates, useWhatsAppLogs } from "@/hooks/useWhatsAppBusiness";
import WhatsAppTemplateEditor from "@/components/professional/WhatsAppTemplateEditor";

export default function InvitePatient() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState<"magic_link" | "password">("magic_link");
  const [attendanceMode, setAttendanceMode] = useState<"online" | "presential">("online");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [clinic, setClinic] = useState<any>(null);
  const [publicProfile, setPublicProfile] = useState<any>(null);
  const { templates } = useWhatsAppTemplates();
  const { logInvitation } = useWhatsAppLogs();

  // Generate friendly invitation link
  useEffect(() => {
    if (!user?.id) return;
    const generateInvitation = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("create-invitation", {
          body: { 
            professional_id: user.id,
            tenant_id: (user as any).user_metadata?.tenant_id 
          }
        });
        if (error) throw error;
        if (data?.code) {
          setInvitationCode(data.code);
        }
      } catch (err) {
        console.error("Error creating friendly invitation:", err);
      }
    };
    generateInvitation();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchData = async () => {
      // Fetch professional profile to use clinic_name as the display name if applicable
      // Based on database check, display_name isn't a column, so we use full_name from profiles
      // or clinic_name from professional_profiles if that's where the user put their title.
      const { data: profProfileData } = await supabase
        .from("professional_profiles")
        .select("clinic_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, tenant_id")
        .eq("id", user.id)
        .single();
      
      // Use full_name for individual identification, but let user message imply they might use clinic_name for branding
      setProfile({
        ...profileData,
        display_name: profileData?.full_name // We'll keep using full_name as the primary source
      });
      setClinic({ name: profProfileData?.clinic_name });

      const { data: publicProfileData } = await supabase
        .from("public_profile_settings")
        .select("slug, is_public")
        .eq("nutritionist_id", user.id)
        .maybeSingle();
      
      setPublicProfile(publicProfileData);
    };
    fetchData();
  }, [user?.id]);

  // Links use production URL for sharing/display by default unless in preview for testing
  const onboardingLink = useMemo(() => getOnboardingUrl(true), []);
  const publicRegisterLink = useMemo(() => getInvitationUrl(undefined, user?.id, true), [user?.id]);
  const quickLink = useMemo(() => user?.id ? getQuickLinkUrl(user.id, true) : "", [user?.id]);
  const publicProfileLink = useMemo(() => {
    if (!publicProfile?.slug) return null;
    return `${PRODUCTION_URL}/p/${publicProfile.slug}`;
  }, [publicProfile]);

  const whatsappMessage = useMemo(() => {
    if (!invitationCode || !profile) return "";
    return getWhatsAppInvitationMessage({
      patientName: name,
      professionalName: profile.display_name || profile.full_name || "Seu Nutricionista",
      clinicName: clinic?.name,
      invitationCode: invitationCode,
      templateType: 'patient_onboarding',
      professionalId: user?.id,
      customTemplate: templates['patient_onboarding']
    });
  }, [name, invitationCode, profile, clinic, templates, user?.id]);

  const whatsappUrl = useMemo(() => {
    const phoneDigits = normalizeWhatsApp(phone || "");
    const base = phoneDigits ? `https://wa.me/${phoneDigits}` : "https://wa.me/";
    return `${base}?text=${encodeURIComponent(whatsappMessage)}`;
  }, [phone, whatsappMessage]);

  const copyToClipboard = (value: string, key: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSendOnboardingEmail = async () => {
    if (!email) return;
    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-onboarding-link", {
        body: { email, patient_id: createdPatientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Link de onboarding enviado por email ✉️");
    } catch (err: any) {
      console.error("send-onboarding-link error:", err);
      toast.error(err.message || "Erro ao enviar link por email");
    } finally {
      setSendingEmail(false);
    }
  };

  const generatePassword = () => {
    setTempPassword("Fit@2026!");
  };

  const handleInvite = async () => {
    if (!name || !email || !user?.id) {
      toast.error("Preencha nome e email do paciente");
      return;
    }

    if (phone) {
      const validation = validateWhatsApp(phone);
      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }
    }

    if (method === "password" && !tempPassword) {
      toast.error("Gere uma senha temporária");
      return;
    }

    const formattedPhone = phone ? formatInternationalWhatsApp(phone) : null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-patient", {
        body: {
          name,
          email,
          phone: formattedPhone,
          method,
          password: method === "password" ? tempPassword : undefined,
          attendance_mode: attendanceMode,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update attendance_mode on the link
      if (data?.patient_id) {
        setCreatedPatientId(data.patient_id);
        await supabase
          .from("nutritionist_patients")
          .update({ attendance_mode: attendanceMode } as any)
          .eq("patient_id", data.patient_id)
          .eq("nutritionist_id", user.id);
      }

      setCreated(true);
      toast.success("Paciente convidado com sucesso!");
    } catch (err: any) {
      console.error("Invite error:", err);
      toast.error(err.message || "Erro ao convidar paciente");
    } finally {
      setLoading(false);
    }
  };

  const credentialsBlock = `Email: ${email}\nSenha: ${tempPassword}\nLink de onboarding: ${onboardingLink}`;

  return (
    <SubscriptionGuard featureName="Convite de Pacientes">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/patients">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-display font-bold">Convidar Paciente</h1>
              <p className="text-xs text-muted-foreground">Cadastre e envie acesso ao seu paciente</p>
            </div>
          </div>
          <WhatsAppTemplateEditor />
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-primary">
              <Zap className="w-4 h-4" />
              <CardTitle className="text-sm">Seu Link de Cadastro Único (Compartilhável)</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Este é o seu link fixo. Mande para qualquer paciente novo. 
              Ao clicar, eles serão vinculados a você automaticamente e levados direto para o cadastro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-2">
              <LinkIcon className="w-3.5 h-3.5 text-primary shrink-0" />
              <code className="text-[10px] md:text-xs flex-1 truncate">{publicRegisterLink}</code>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 gap-1"
                onClick={() => copyToClipboard(publicRegisterLink, "public_link", "Link público")}
              >
                {copied === "public_link" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-accent/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-accent">
              <LinkIcon className="w-4 h-4" />
              <CardTitle className="text-sm">Link Rápido (Sem Onboarding)</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Mande esse link para novos interessados (prospecção). 
              O paciente cria a conta em segundos e já fica vinculado a você, 
              mas o onboarding completo fica pendente até que você autorize.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-2">
              <LinkIcon className="w-3.5 h-3.5 text-accent shrink-0" />
              <code className="text-[10px] md:text-xs flex-1 truncate">{quickLink}</code>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 gap-1"
                onClick={() => copyToClipboard(quickLink, "quick_link", "Link rápido")}
              >
                {copied === "quick_link" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full gap-2 border-[#25D366]/30 hover:bg-[#25D366]/10 text-[#128C7E]"
              onClick={() => logInvitation({ patientName: "Lead Link Rápido", invitationType: "quick_link" })}
            >
              <a 
                href={`https://wa.me/?text=${encodeURIComponent(getWhatsAppInvitationMessage({
                  patientName: "",
                  professionalName: profile?.display_name || profile?.full_name || "Seu Nutri",
                  clinicName: clinic?.name,
                  invitationCode: user?.id || "",
                  templateType: 'quick_link',
                  customTemplate: templates['quick_link']
                }))}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Compartilhar Link Rápido
              </a>
            </Button>
          </CardContent>
        </Card>

        {publicProfileLink && publicProfile?.is_public && (
          <Card className="border-info/20 bg-info/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-info">
                <Globe className="w-4 h-4" />
                <CardTitle className="text-sm">Seu Perfil Público (Marketing)</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Mande esse link em suas redes sociais. O paciente pode conhecer seu trabalho 
                e solicitar um agendamento ou se cadastrar diretamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-2">
                <Globe className="w-3.5 h-3.5 text-info shrink-0" />
                <code className="text-[10px] md:text-xs flex-1 truncate">{publicProfileLink}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 gap-1"
                  onClick={() => copyToClipboard(publicProfileLink, "public_profile", "Link do perfil")}
                >
                  {copied === "public_profile" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!created ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados do Paciente</CardTitle>
              <CardDescription>O paciente receberá acesso controlado à plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do paciente" />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="paciente@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Telefone (opcional)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>

              <div className="space-y-3 pt-2">
                <Label>Modo de atendimento</Label>
                <RadioGroup value={attendanceMode} onValueChange={(v) => setAttendanceMode(v as any)} className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-all">
                    <RadioGroupItem value="online" id="att_online" />
                    <Label htmlFor="att_online" className="flex-1 cursor-pointer">
                      <p className="text-sm font-medium">🌐 Online</p>
                      <p className="text-xs text-muted-foreground">Paciente preenche onboarding remotamente</p>
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-all">
                    <RadioGroupItem value="presential" id="att_presential" />
                    <Label htmlFor="att_presential" className="flex-1 cursor-pointer">
                      <p className="text-sm font-medium">🏥 Presencial</p>
                      <p className="text-xs text-muted-foreground">Profissional preenche durante a consulta</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3 pt-2">
                <Label>Método de acesso</Label>
                <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)} className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-all">
                    <RadioGroupItem value="magic_link" id="magic_link" />
                    <Label htmlFor="magic_link" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Link por email</p>
                          <p className="text-xs text-muted-foreground">Paciente recebe link para definir senha</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-all">
                    <RadioGroupItem value="password" id="password" />
                    <Label htmlFor="password" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-accent" />
                        <div>
                          <p className="text-sm font-medium">Senha temporária</p>
                          <p className="text-xs text-muted-foreground">Você compartilha as credenciais</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {method === "password" && (
                <div className="space-y-2">
                  <Label>Senha temporária</Label>
                  <div className="flex gap-2">
                    <Input value={tempPassword} readOnly placeholder="Clique em gerar" className="font-mono" />
                    <Button variant="outline" size="sm" onClick={generatePassword}>Gerar</Button>
                  </div>
                </div>
              )}

              <Button onClick={handleInvite} disabled={loading} className="w-full gap-2">
                <UserPlus className="w-4 h-4" />
                {loading ? "Cadastrando..." : "Convidar Paciente"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold">Paciente Convidado!</h3>
                <p className="text-sm text-muted-foreground mt-1">{name} foi cadastrado(a) com sucesso.</p>
              </div>

              <div className="space-y-2 text-left">
                <p className="text-sm font-semibold text-foreground">📤 Link oficial de convite</p>
                <p className="text-xs text-muted-foreground">
                  Este link é exclusivo para este paciente. Ele será vinculado a você e levado ao onboarding.
                </p>
                <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-2">
                  <LinkIcon className="w-4 h-4 text-primary shrink-0" />
                  <code className="text-xs flex-1 truncate">{getInvitationUrl(invitationCode || "", user?.id, true)}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 gap-1"
                    onClick={() => copyToClipboard(getInvitationUrl(invitationCode || "", user?.id, true), "link", "Link de convite")}
                  >
                    {copied === "link" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <Button
                    asChild
                    size="lg"
                    className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white border-none shadow-lg shadow-emerald-500/20"
                  >
                    <a 
                      href={whatsappUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => logInvitation({ patientName: name, patientPhone: phone, invitationType: 'patient_onboarding' })}
                    >
                      <MessageCircle className="w-4 h-4" /> Enviar via WhatsApp
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={handleSendOnboardingEmail}
                    disabled={sendingEmail}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sendingEmail ? "Enviando..." : "Enviar por email"}
                  </Button>
                </div>
              </div>

              {method === "magic_link" && (
                <p className="text-xs text-muted-foreground">
                  Um link inicial também foi enviado para <strong>{email}</strong>.
                </p>
              )}

              {method === "password" && (
                <div className="space-y-2 text-left">
                  <p className="text-sm font-semibold text-foreground">🔐 Credenciais geradas</p>
                  <div className="bg-card border border-border rounded-lg p-3 font-mono text-sm space-y-0.5">
                    <p>Email: {email}</p>
                    <p>Senha: {tempPassword}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => copyToClipboard(credentialsBlock, "creds", "Credenciais + link")}
                  >
                    {copied === "creds" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === "creds" ? "Copiado!" : "Copiar tudo (credenciais + link)"}
                  </Button>
                </div>
              )}

              <div className="flex gap-2 justify-center pt-2 flex-wrap">
                {attendanceMode === "presential" && createdPatientId && (
                  <Button onClick={() => navigate(`/in-office/${createdPatientId}`)} className="gap-2">
                    🏥 Iniciar Consulta Presencial
                  </Button>
                )}
                <Button variant="outline" onClick={() => { setCreated(false); setName(""); setEmail(""); setPhone(""); setTempPassword(""); setCreatedPatientId(null); }}>
                  Convidar outro
                </Button>
                <Button variant="ghost" onClick={() => navigate("/patients")}>
                  Ver pacientes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SubscriptionGuard>
  );
}
