import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Eye, EyeOff, ArrowRight, CheckCircle2, Search, Stethoscope, Loader2, UserPlus, ArrowLeft, Building2,
  Download, Copy, FileJson, AlertTriangle, User
} from "lucide-react";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import { formatInternationalWhatsApp, validateWhatsApp as sharedValidateWhatsApp } from "@/utils/whatsapp";

interface ProfessionalResult {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  clinic_name: string | null;
  phone: string | null;
}

export default function PatientRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") || "";
  const preselectedNutri = searchParams.get("nutri") || "";
  const signature = searchParams.get("sig") || "";
  const invitationCode = searchParams.get("code") || "";
  const [sigValid, setSigValid] = useState<boolean | null>(null);
  const correlationId = useMemo(() => crypto.randomUUID(), []);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [avatarError, setAvatarError] = useState(false);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toISOString();
    const newLog = `[${timestamp}] [CID:${correlationId}] ${msg}`;
    console.log(newLog);
    setDebugLogs(prev => [...prev, newLog]);
  }, [correlationId]);

  const copyLogs = () => {
    const logText = debugLogs.join("\n");
    navigator.clipboard.writeText(logText);
    toast.success("Logs copiados para a área de transferência!");
  };

  const exportLogsAsJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(debugLogs));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `diagnostic_logs_${new Date().getTime()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappError, setWhatsappError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Professional (optional)
  const [showProfSearch, setShowProfSearch] = useState(!!preselectedNutri);
  const [profSearch, setProfSearch] = useState("");
  const [profResults, setProfResults] = useState<ProfessionalResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalResult | null>(null);
  const [isProfConfirmed, setIsProfConfirmed] = useState(false);

  // Pre-select professional from URL
  useEffect(() => {
    if (!preselectedNutri) return;
    (async () => {
      addLog(`Buscando dados do profissional ${preselectedNutri}...`);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, phone")
        .eq("user_id", preselectedNutri)
        .maybeSingle();
      
      const { data: profData } = await supabase
        .from("professional_profiles")
        .select("clinic_name")
        .eq("user_id", preselectedNutri)
        .maybeSingle();

      if (profileData) {
        addLog(`Profissional encontrado: ${profileData.full_name}`);
        setSelectedProfessional({
          user_id: profileData.user_id,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          clinic_name: (profData as any)?.clinic_name || null,
          phone: profileData.phone,
        });
        // Reset confirmation if nutri changes
        setIsProfConfirmed(false);
      } else {
        addLog(`AVISO: Profissional ${preselectedNutri} não encontrado no banco.`);
      }
    })();
  }, [preselectedNutri, addLog]);


  // Robust invitation code validation
  useEffect(() => {
    if (!invitationCode || sigValid !== null) {
      if (!invitationCode) addLog("Nenhum código de convite detectado na URL.");
      return;
    }

    const validateInvite = async () => {
      addLog(`Validando código de convite: ${invitationCode}...`);
      try {
        const { data: invite, error } = await supabase
          .from("invitations")
          .select("*, profiles!invitations_professional_id_fkey(full_name, avatar_url, phone)")
          .eq("code", invitationCode)
          .maybeSingle();

        if (error) {
          addLog(`Erro Supabase ao buscar convite: ${error.message}`);
          await supabase.from("invitation_logs").insert({
            event_type: "error",
            correlation_id: correlationId,
            details: { error: error.message, stage: "fetch_invitation", code: invitationCode, correlationId }
          });
          throw error;
        }

        if (!invite) {
          addLog("Código não encontrado em convites. Tentando onboarding_tokens...");
          // Fallback to onboarding_tokens
          const { data: onboarding, error: onboardingError } = await supabase.rpc("validate_onboarding_token" as any, { _token: invitationCode });
          
          if (!onboardingError && onboarding?.valid) {
            addLog("Token de onboarding válido encontrado.");
            const { data: profProfile } = await supabase
              .from("profiles")
              .select("user_id, full_name, avatar_url, phone")
              .eq("user_id", onboarding.nutritionist_id)
              .maybeSingle();

            setSelectedProfessional({
              user_id: onboarding.nutritionist_id,
              full_name: onboarding.nutritionist_name || profProfile?.full_name || "Profissional",
              avatar_url: profProfile?.avatar_url || null,
              clinic_name: null,
              phone: profProfile?.phone || null,
            });
            
            if (onboarding.patient_email) setEmail(onboarding.patient_email);
            if (onboarding.patient_name) setName(onboarding.patient_name);
            
            setIsProfConfirmed(false);
            setSigValid(true);
            return;
          }

          addLog("Código de convite/onboarding não encontrado.");
          setSigValid(false);
          // Don't toast immediately if it's just an invalid code, maybe they want to search?
          // But usually code is specific.
          return;
        }

        addLog(`Convite encontrado. Status: ${invite.status}. Profissional: ${invite.professional_id}`);

        const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
        if (isExpired) {
          addLog("O convite está expirado.");
          setSigValid(false);
          await supabase.from("invitation_logs").insert({
            invitation_id: invite.id,
            professional_id: invite.professional_id,
            patient_email: invite.patient_email,
            event_type: "expired",
            correlation_id: correlationId,
            details: { expires_at: invite.expires_at, code: invitationCode, correlationId }
          });
          return;
        }

        if (invite.status === 'revoked') {
          addLog("O convite foi revogado pelo profissional.");
          setSigValid(false);
          await supabase.from("invitation_logs").insert({
            invitation_id: invite.id,
            professional_id: invite.professional_id,
            patient_email: invite.patient_email,
            event_type: "revoked",
            correlation_id: correlationId,
            details: { code: invitationCode, correlationId }
          });
          return;
        }

        // Set professional automatically
        const prof = invite.profiles as any;
        setSelectedProfessional({
          user_id: invite.professional_id,
          full_name: prof?.full_name || "Profissional",
          avatar_url: prof?.avatar_url || null,
          clinic_name: (invite.metadata as any)?.clinic_name || null,
          phone: prof?.phone || null,
        });
        setIsProfConfirmed(false);
        setSigValid(true);
        addLog("Vínculo profissional validado via convite com sucesso.");

        await supabase.from("invitation_logs").insert({
          invitation_id: invite.id,
          professional_id: invite.professional_id,
          patient_email: invite.patient_email || email,
          event_type: "validated",
          correlation_id: correlationId,
          details: { 
            professional_id: invite.professional_id,
            patient_email_match: invite.patient_email === email,
            code: invitationCode,
            correlationId
          }
        });

        if (invite.patient_email && !email) setEmail(invite.patient_email);
        if (invite.patient_name && !name) setName(invite.patient_name);

      } catch (err: any) {
        addLog(`Falha crítica na validação do convite: ${err.message}`);
        setSigValid(false);
      }
    };

    validateInvite();
  }, [invitationCode, sigValid, email, correlationId, addLog]);

  // Legacy signature verification (if no invitationCode)
  useEffect(() => {
    if (invitationCode) return;
    if (!preselectedNutri) return;

    // Caso 1: Link com assinatura legada (?nutri=ID&sig=...)
    if (signature) {
      const verifySig = async () => {
        addLog(`Verificando assinatura legada para nutri ${preselectedNutri}...`);
        try {
          const { data, error } = await supabase.functions.invoke("verify-registration-token", {
            body: { nutriId: preselectedNutri, signature, correlationId }
          });
          if (error) throw error;
          setSigValid(data.isValid);
          if (!data.isValid) {
            addLog("Assinatura legada inválida.");
          } else {
            addLog("Assinatura legada validada com sucesso.");
          }
        } catch (err: any) {
          addLog(`Erro na verificação de assinatura: ${err.message}`);
          setSigValid(false);
        }
      };
      verifySig();
      return;
    }

    // Caso 2: Link direto sem assinatura (?nutri=ID) — valida só se o profissional existe
    addLog("Link direto sem assinatura (?nutri=ID). Validando existência do profissional...");
    (async () => {
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", preselectedNutri)
        .maybeSingle();

      if (error || !prof) {
        addLog(`Profissional ${preselectedNutri} não encontrado no banco.`);
        setSigValid(false);
        return;
      }
      addLog("Profissional confirmado via link direto. Liberando cadastro.");
      setSigValid(true);
    })();
  }, [preselectedNutri, signature, invitationCode, addLog, correlationId]);

  // Search professionals
  const searchProfessionals = useCallback(async (query: string) => {
    if (query.length < 2) { setProfResults([]); return; }
    setSearchLoading(true);
    const { data } = await supabase.rpc("search_professionals" as any, {
      _query: query,
      _limit: 8,
    });
    setProfResults((data as ProfessionalResult[]) || []);
    setSearchLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchProfessionals(profSearch), 300);
    return () => clearTimeout(t);
  }, [profSearch, searchProfessionals]);

  const validateWhatsApp = (val: string) => {
    const { isValid, error } = sharedValidateWhatsApp(val);
    setWhatsappError(error);
    return isValid;
  };


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if ((preselectedNutri || invitationCode) && sigValid === false) {
      toast.error("Vínculo de profissional inválido. Use o link oficial fornecido pelo seu profissional.");
      return;
    }
    
    if (whatsappError) {
      toast.error("Por favor, corrija o número de WhatsApp antes de continuar.");
      return;
    }

    if (!validateWhatsApp(whatsapp)) {
      toast.error("Por favor, corrija o número de WhatsApp");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    const formattedWhatsapp = formatInternationalWhatsApp(whatsapp);
    
    setLoading(true);
    addLog(`Iniciando registro para ${email}...`);
    try {
      const nutriId = selectedProfessional?.user_id || null;
      addLog(`ID do Profissional selecionado: ${nutriId || "Nenhum"}`);

      if (!nutriId) {
        addLog("Nenhum profissional selecionado. Criando apenas lead...");
        const { error: leadErr } = await supabase.from("lead_requests").insert({
          nutritionist_id: "00000000-0000-0000-0000-000000000000",
          name,
          email: email.trim().toLowerCase(),
          phone: formattedWhatsapp,
          whatsapp: formattedWhatsapp,
          source: "self_register",
          referral_code: refCode || null,
          message: "Cadastro espontâneo sem nutricionista selecionado.",
        } as any);

        if (leadErr) {
          addLog(`Erro ao criar lead: ${leadErr.message}`);
          toast.error("Selecione um profissional para concluir o cadastro.");
          setShowProfSearch(true);
          setLoading(false);
          return;
        }

        addLog("Lead criado com sucesso.");
        toast.success("Recebemos seu interesse!");
        setDone(true);
        setLoading(false);
        return;
      }

      // ─── FLUXO B: COM NUTRICIONISTA ───
      addLog("Criando usuário no Auth...");
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });

      if (signUpErr) {
        addLog(`Erro no Auth SignUp: ${signUpErr.message}`);
        toast.error(signUpErr.message === "User already registered"
          ? "Este e-mail já está cadastrado. Faça login."
          : signUpErr.message);
        setLoading(false);
        return;
      }

      if (!signUpData.user) {
        addLog("Auth SignUp retornou sucesso mas sem usuário.");
        toast.error("Falha ao criar conta.");
        setLoading(false);
        return;
      }

      addLog(`Usuário Auth criado: ${signUpData.user.id}. Vinculando paciente...`);

      // Chama RPC canônica
      const { error: canonErr } = await supabase.rpc("create_patient_canonical" as any, {
        _patient_id: signUpData.user.id,
        _full_name: name,
        _email: email.trim().toLowerCase(),
        _phone: phone || null,
        _whatsapp: formattedWhatsapp,
        _nutritionist_id: nutriId,
        _source: "register",
        _metadata: { 
          referral_code: refCode || null,
          invitation_code: invitationCode || null 
        },
      });

      if (canonErr) {
        addLog(`Erro na RPC create_patient_canonical: ${canonErr.message}`);
        // Tenta inserção manual se a RPC falhar por RLS ou algo assim
        addLog("Tentando fallback manual para vínculo...");
        await supabase.from("profiles").update({ 
          full_name: name, 
          phone: formattedWhatsapp 
        } as any).eq("id", signUpData.user.id);
      }

      // Notifica o profissional e atualiza status do convite
      try {
        if (invitationCode) {
          addLog("Atualizando status do convite para 'completed'...");
          await supabase
            .from("invitations")
            .update({ 
              status: 'completed', 
              used_at: new Date().toISOString() 
            } as any)
            .eq("code", invitationCode);
            
          const { data: inviteData } = await supabase.from("invitations").select("id, professional_id, patient_email").eq("code", invitationCode).maybeSingle();
          if (inviteData) {
            await supabase.from("invitation_logs").insert({
              invitation_id: inviteData.id,
              professional_id: inviteData.professional_id,
              patient_email: inviteData.patient_email || email,
              event_type: "completed",
              details: { 
                patient_id: signUpData.user.id,
                domain: window.location.hostname
              },
              user_agent: navigator.userAgent
            });
          }
        }

        addLog("Enviando notificação ao profissional...");
        await supabase.from("notifications").insert({
          user_id: nutriId,
          title: "Novo paciente cadastrado",
          message: `${name} se cadastrou via convite.`,
          type: "patient_registered",
          entity_type: "patient",
          entity_id: signUpData.user.id,
          target_route: `/patients/${signUpData.user.id}`,
        } as any);
      } catch (err: any) {
        addLog(`Erro secundário (notificação/convite): ${err.message}`);
      }

      addLog("Registro concluído com sucesso.");
      if (signUpData.session) {
        setCurrentUserId(signUpData.user.id);
        toast.success("Conta criada! Redirecionando...");
        navigate("/consent", { replace: true });
        return;
      }

      setCurrentUserId(signUpData.user.id);
      toast.success("Conta criada! Verifique seu e-mail.");
      setDone(true);
    } catch (err: any) {
      addLog(`Erro inesperado: ${err.message}`);
      toast.error("Erro ao criar conta. Tente novamente.");
    }
    setLoading(false);
  };

  // ─── Done Screen ───
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="mb-6"><FitJourneyLogo size="lg" /></div>
          <Card className="shadow-card border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">Cadastro Realizado! 🎉</h2>
                <p className="text-muted-foreground text-sm">
                  Verifique seu e-mail para confirmar a conta. Depois, faça login para iniciar sua jornada.
                </p>
              </div>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Ir para Login <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (selectedProfessional && !isProfConfirmed && (preselectedNutri || invitationCode)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl opacity-50" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/10 blur-3xl opacity-50" />
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md relative z-10 text-center">
          <div className="mb-8 flex justify-center"><FitJourneyLogo size="lg" /></div>
          <Card className="shadow-2xl border-primary/20 bg-card/90 backdrop-blur-md">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-25" />
                <div className="relative w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                  {selectedProfessional.avatar_url && !avatarError ? (
                    <img 
                      src={selectedProfessional.avatar_url} 
                      alt={selectedProfessional.full_name} 
                      className="w-full h-full object-cover"
                      onError={() => {
                        addLog("Erro ao carregar avatar do nutricionista. Usando fallback.");
                        setAvatarError(true);
                      }}
                    />
                  ) : (
                    <User className="w-10 h-10 text-primary" />
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Você foi convidado!</h2>
                <div className="space-y-1">
                  <p className="text-muted-foreground">
                    O profissional <strong className="text-primary">{selectedProfessional.full_name}</strong> quer acompanhar sua jornada.
                  </p>
                  {selectedProfessional.clinic_name && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground bg-muted/50 py-1 px-3 rounded-full w-fit mx-auto">
                      <Building2 className="w-3 h-3" />
                      {selectedProfessional.clinic_name}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3">
                <Button onClick={() => setIsProfConfirmed(true)} className="w-full h-12 text-base font-bold gradient-primary shadow-lg shadow-primary/20">
                  Aceitar Convite e Continuar <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button variant="ghost" onClick={() => navigate(`/auth?next=${encodeURIComponent(`/cadastro?nutri=${preselectedNutri}&code=${invitationCode}`)}`)} className="text-muted-foreground hover:text-foreground">
                  Já tenho uma conta
                </Button>
              </div>
              
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                Vínculo profissional automático ao concluir
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }


  // GUARD: Cadastro de paciente é EXCLUSIVAMENTE via link do profissional.
  // Sem `code` (convite) e sem `nutri` (link rápido), bloqueia e instrui o
  // paciente a procurar o nutricionista. Sem este guard, qualquer pessoa
  // poderia cair em /cadastro pela home e criar conta órfã (sem vínculo).
  if (!preselectedNutri && !invitationCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="flex flex-col items-center mb-6">
            <FitJourneyLogo size="lg" />
          </div>

          <Card className="shadow-card border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8 space-y-5 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Stethoscope className="w-8 h-8 text-primary" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Acesso por convite</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  O cadastro de paciente no FitJourney é feito através do link do
                  seu nutricionista ou personal. Peça o link e abra-o para
                  começar.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3 text-left text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Como pegar o link?</p>
                <p>1. Fale com seu profissional pelo WhatsApp.</p>
                <p>2. Peça o link de cadastro do FitJourney.</p>
                <p>3. Toque no link e o cadastro abre já vinculado.</p>
              </div>

              <Button asChild variant="outline" className="w-full h-12">
                <Link to="/auth">Já tenho conta — Entrar</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-6">
          <FitJourneyLogo size="lg" />
          <p className="text-muted-foreground mt-2 text-sm">Crie sua conta em segundos</p>
        </div>

        <Card className="shadow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6 pb-6">
            <form onSubmit={handleRegister} className="space-y-4">

              {/* Selected professional badge */}
              {selectedProfessional && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {selectedProfessional.avatar_url && !avatarError ? (
                      <img 
                        src={selectedProfessional.avatar_url} 
                        alt="Prof" 
                        className="w-full h-full object-cover" 
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground leading-tight">Profissional Vinculado</p>
                    <p className="font-medium text-xs text-foreground truncate">{selectedProfessional.full_name}</p>
                    {selectedProfessional.clinic_name && (
                      <p className="text-[9px] text-muted-foreground truncate">{selectedProfessional.clinic_name}</p>
                    )}
                  </div>
                  {preselectedNutri ? (
                    <button type="button" onClick={() => setIsProfConfirmed(false)}
                      className="text-[10px] text-primary hover:underline shrink-0 flex items-center gap-1">
                      <ArrowLeft className="w-2.5 h-2.5" /> Voltar
                    </button>
                  ) : (
                    <button type="button" onClick={() => { setSelectedProfessional(null); setShowProfSearch(true); setIsProfConfirmed(false); }}
                      className="text-xs text-primary hover:underline shrink-0">Trocar</button>
                  )}
                </div>
              )}


              <div>
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <div>
                <Label htmlFor="whatsapp" className="flex justify-between items-center">
                  <span>WhatsApp *</span>
                  {whatsappError && <span className="text-[10px] text-destructive animate-pulse">{whatsappError}</span>}
                </Label>
                <Input 
                  id="whatsapp" 
                  type="tel" 
                  value={whatsapp} 
                  onChange={(e) => {
                    setWhatsapp(e.target.value);
                    if (e.target.value) validateWhatsApp(e.target.value);
                  }} 
                  onBlur={() => validateWhatsApp(whatsapp)}
                  placeholder="(11) 99999-9999 ou +55..." 
                  required
                  className={whatsappError ? "border-destructive focus-visible:ring-destructive" : ""}
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/*
                * REMOVIDO: bloco "Vincular a um profissional".
                * Cadastro de paciente é SEMPRE via link do profissional (?code=…
                * ou ?nutri=…). Não existe vínculo manual nesta tela — se o
                * paciente chega aqui sem contexto, mostramos a tela de bloqueio
                * abaixo (vide guard de "useNoContextGuard").
                */}

              {refCode && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    Código de referência: <strong>{refCode}</strong>
                  </span>
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base font-bold gradient-primary shadow-md" disabled={loading || !!whatsappError || ((preselectedNutri || invitationCode) && sigValid === null)}>
                {loading || ((preselectedNutri || invitationCode) && sigValid === null) ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {sigValid === null ? "Validando link..." : "Criando conta..."}
                  </span>
                ) : "Concluir Cadastro"}
              </Button>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Já tem conta? <Link to={`/auth?next=${encodeURIComponent(`/cadastro?nutri=${preselectedNutri}&code=${invitationCode}`)}`} className="text-primary hover:underline font-medium">Entrar agora</Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {debugLogs.length > 0 && (
          <div className="mt-6 p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-border text-[10px] font-mono overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground uppercase tracking-wider font-bold">Logs de Diagnóstico</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyLogs} title="Copiar logs">
                  <Copy className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={exportLogsAsJson} title="Exportar JSON">
                  <FileJson className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
              {debugLogs.map((log, i) => (
                <div key={i} className="text-muted-foreground border-l border-primary/30 pl-2 py-0.5">{log}</div>
              ))}
            </div>
            {sigValid === false && (
              <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded flex items-start gap-2 text-destructive">
                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold uppercase tracking-tight text-[9px]">Vínculo do Profissional Não Validado</p>
                  <p className="text-[9px] leading-tight">
                    {invitationCode 
                      ? "O código de convite pode estar expirado, já ter sido usado ou ser inválido." 
                      : signature 
                        ? "A assinatura de segurança do link é inválida ou expirou." 
                        : "Não conseguimos encontrar o nutricionista indicado pelo link."}
                  </p>
                  <p className="text-[9px] mt-1 font-semibold">O que fazer?</p>
                  <ul className="text-[8px] list-disc list-inside opacity-80">
                    <li>Peça um novo link de convite ao seu profissional</li>
                    <li>Verifique se você copiou o link inteiro</li>
                    <li>Tente buscar o profissional manualmente acima</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4">
          Ao criar sua conta, você concorda com os termos de uso.
        </p>
      </motion.div>
    </div>
  );
}
