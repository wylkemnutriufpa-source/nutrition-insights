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
  Download, Copy, FileJson, AlertTriangle, User, RefreshCw
} from "lucide-react";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import { formatInternationalWhatsApp, validateWhatsApp as sharedValidateWhatsApp } from "@/utils/whatsapp";
import { promptWhatsAppNotification } from "@/utils/whatsappNotification";
import { INVITATION_TEXTS } from "@/config/invitation-texts";

interface ProfessionalResult {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  clinic_name: string | null;
  phone: string | null;
}


type InvitationIssue = {
  reason: "invalid" | "expired" | "revoked";
  message: string;
} | null;

type RegistrationLinkSource = "none" | "nutri" | "invitation" | "onboarding_token" | "nutri_fallback";

const buildCadastroPath = (params: {
  preselectedNutri: string;
  invitationCode: string;
  selectedProfessional: ProfessionalResult | null;
}) => {
  const next = new URLSearchParams();
  const professionalId = params.preselectedNutri || params.selectedProfessional?.user_id || "";
  if (professionalId) next.set("nutri", professionalId);
  if (params.invitationCode) next.set("code", params.invitationCode);
  const query = next.toString();
  return `/cadastro${query ? `?${query}` : ""}`;
};

const resolveRegistrationDisplay = (params: {
  preselectedNutri: string;
  invitationCode: string;
  selectedProfessional: ProfessionalResult | null;
  isProfConfirmed: boolean;
  sigValid: boolean | null;
}) => {
  const hasNutriParam = Boolean(params.preselectedNutri);
  const hasCodeParam = Boolean(params.invitationCode);
  const hasAnyLinkContext = hasNutriParam || hasCodeParam;
  const hasSelectedProfessional = Boolean(params.selectedProfessional?.user_id);
  
  // PADRONIZAÇÃO: TODOS os links suportados (?nutri=, ?code=, ?token=) devem
  // exibir a tela de boas-vindas "Você está sendo convidado!" com a foto do
  // profissional antes do formulário, para garantir confirmação visual do
  // vínculo. Anteriormente o link direto pulava essa tela; agora é unificado.
  const isDirectProfessionalLink = hasNutriParam && !hasCodeParam;

  const shouldShowInvitationWelcome = Boolean(
    hasAnyLinkContext && hasSelectedProfessional && !params.isProfConfirmed
  );

  const shouldShowInvalidCodeOnly = Boolean(
    hasCodeParam && params.sigValid === false && !hasSelectedProfessional && !hasNutriParam
  );

  const routeDecision = !hasAnyLinkContext
    ? "no_link_context"
    : shouldShowInvalidCodeOnly
      ? "invalid_code_only"
      : (shouldShowInvitationWelcome)
        ? "invitation_welcome"
        : hasSelectedProfessional
          ? "registration_linked"
          : "registration_pending";

  return {
    hasAnyLinkContext,
    shouldShowInvitationWelcome,
    shouldShowInvalidCodeOnly,
    shouldShowNoContextGuard: !hasAnyLinkContext,
    isLinkValidationPending: hasAnyLinkContext && params.sigValid === null,
    isDirectProfessionalLink,
    routeDecision,
  };
};

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
  const [linkageError, setLinkageError] = useState<{ type: string; message: string } | null>(null);



  // Professional (optional)
  const [showProfSearch, setShowProfSearch] = useState(!!preselectedNutri);
  const [profSearch, setProfSearch] = useState("");
  const [profResults, setProfResults] = useState<ProfessionalResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalResult | null>(null);
  const [isProfConfirmed, setIsProfConfirmed] = useState(false);
  const [linkSource, setLinkSource] = useState<RegistrationLinkSource>(preselectedNutri ? "nutri" : invitationCode ? "invitation" : "none");
  const [invitationIssue, setInvitationIssue] = useState<InvitationIssue>(null);

  const registrationDisplay = resolveRegistrationDisplay({
    preselectedNutri,
    invitationCode,
    selectedProfessional,
    isProfConfirmed,
    sigValid,
  });
  const currentCadastroPath = buildCadastroPath({ preselectedNutri, invitationCode, selectedProfessional });

  // Mostramos o profissional resolvido de forma clara.
  // IMPORTANTE: Agora sempre mostramos a tela de boas-vindas com a foto do profissional
  // para garantir a confiança do paciente no vínculo, conforme solicitado pelo usuário.
  useEffect(() => {
    if (selectedProfessional && !isProfConfirmed) {
      addLog(`Profissional resolvido: ${selectedProfessional.full_name}. Mostrando tela de boas-vindas para confirmação visual.`);
      // Removemos a confirmação automática para links diretos
    }
  }, [selectedProfessional, isProfConfirmed, addLog]);

  useEffect(() => {
    const state = {
      decision: registrationDisplay.routeDecision,
      invitationCode: Boolean(invitationCode),
      preselectedNutri: Boolean(preselectedNutri),
      selectedProfessional: selectedProfessional?.user_id || null,
      isProfConfirmed,
      sigValid,
      linkSource,
    };
    addLog(`Decisão PatientRegister: ${JSON.stringify(state)}`);
  }, [
    registrationDisplay.routeDecision,
    invitationCode,
    preselectedNutri,
    selectedProfessional?.user_id,
    isProfConfirmed,
    sigValid,
    linkSource,
    addLog,
  ]);

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
        setLinkSource(current => current === "invitation" || current === "onboarding_token" ? current : "nutri");
        // REMOVIDO: Confirmação automática removida para garantir que a foto do profissional apareça.
        setIsProfConfirmed(false);
        setSigValid(true);
      } else {
        addLog(`AVISO: Profissional ${preselectedNutri} não encontrado no banco.`);
        setSigValid(false);
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
        const { data: validation, error } = await supabase.functions.invoke("validate-invitation", {
          body: { code: invitationCode, correlationId },
        });

        if (error) {
          addLog(`Erro ao validar convite pela função segura: ${error.message}`);
          await supabase.from("invitation_logs").insert({
            event_type: "error",
            correlation_id: correlationId,
            details: { error: error.message, stage: "fetch_invitation", code: invitationCode, correlationId }
          });
          throw error;
        }

        if (!validation?.success) {
          addLog(`Convite não validado (${validation?.error_code || "INVALID_CODE"}). Tentando onboarding_tokens...`);
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
            
            setLinkSource("onboarding_token");
            setInvitationIssue(null);
            setIsProfConfirmed(false);
            setSigValid(true);
            return;
          }

          addLog("Código de convite/onboarding não encontrado ou não utilizável.");
          const reason = validation?.error_code === "EXPIRED" ? "expired" : validation?.error_code === "REVOKED" ? "revoked" : "invalid";
          setInvitationIssue({
            reason,
            message: validation?.message || "Este código não foi encontrado. Você pode continuar o cadastro, mas o vínculo automático não será aplicado.",
          });
          setSigValid(false);
          return;
        }

        const invite = validation.invitation;
        addLog(`Convite encontrado. Status: ${invite.status}. Profissional: ${invite.professional_id}`);

        // Set professional automatically
        const prof = invite.professional || invite.profiles;
        setSelectedProfessional({
          user_id: invite.professional_id,
          full_name: prof?.full_name || "Profissional",
          avatar_url: prof?.avatar_url || null,
          clinic_name: (invite.metadata as any)?.clinic_name || null,
          phone: prof?.phone || null,
        });
        setLinkSource("invitation");
        setInvitationIssue(null);
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
            setLinkSource("nutri");
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
      setLinkSource("nutri");
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
      const nutriId = selectedProfessional?.user_id || preselectedNutri || null;
      addLog(`ID do Profissional selecionado: ${nutriId || "Nenhum"}`);

      if (!nutriId && (preselectedNutri || invitationCode)) {
        addLog("BLOQUEIO: Cadastro sem vínculo profissional em link parametrizado.");
        toast.error("Vínculo de profissional não identificado. O cadastro de pacientes exige um convite válido.");
        setLoading(false);
        return;
      }

      if (!nutriId) {
        addLog("Nenhum profissional selecionado. Criando lead...");
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
          return;
        }

        addLog("Lead criado com sucesso.");
        toast.success("Recebemos seu interesse!");
        setDone(true);
        return;
      }

      // ─── FLUXO B: COM NUTRICIONISTA ───
      addLog("Criando usuário no Auth...");
      
      // CRITICAL: Ensure both nutritionist_id and invitation_code are in metadata for trigger handle_new_user
      const signUpOptions = { 
        data: { 
          full_name: name,
          nutritionist_id: nutriId,
          invitation_code: invitationCode || null,
          role: 'patient'
        } 
      };
      
      addLog(`Metadata para SignUp: ${JSON.stringify(signUpOptions.data)}`);

      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: signUpOptions,
      });

      if (signUpErr) {
        addLog(`Erro no Auth SignUp: ${signUpErr.message}`);
        toast.error(signUpErr.message === "User already registered"
          ? "Este e-mail já está cadastrado. Faça login."
          : signUpErr.message);
        return;
      }

      if (!signUpData.user) {
        addLog("Auth SignUp retornou sucesso mas sem usuário.");
        toast.error("Falha ao criar conta.");
        return;
      }

      addLog(`Usuário Auth criado: ${signUpData.user.id}. Vinculando paciente...`);

      // 4.5. Garante que o usuário autenticado tenha o token de acesso pronto
      const { data: { session } } = await supabase.auth.getSession();
      addLog(`Sessão ativa: ${!!session}`);

      // 5. Vincular paciente via RPC canônica — AGUARDA COMPLETAMENTE antes de prosseguir
      addLog(`Chamando create_patient_canonical com nutriId: ${nutriId}`);
      const { data: canonData, error: canonErr } = await supabase.rpc("create_patient_canonical" as any, {
        _patient_id: signUpData.user.id,
        _full_name: name,
        _email: email.trim().toLowerCase(),
        _phone: formattedWhatsapp,
        _whatsapp: formattedWhatsapp,
        _nutritionist_id: nutriId,
        _source: invitationCode ? "invite" : "register",
        _metadata: { 
          referral_code: refCode || null,
          invitation_code: invitationCode || null,
          registration_url: window.location.href,
          correlation_id: correlationId
        },
      });

      if (canonErr) {
        addLog(`ERRO CRÍTICO na RPC create_patient_canonical: ${canonErr.message}`);
        // Se a RPC falhou, registramos o erro para auditoria mas tentamos um fallback mínimo 
        // para que o paciente não fique totalmente perdido, embora o vínculo possa falhar.
        try {
          await supabase.from("onboarding_runtime_errors" as any).insert({
            patient_id: signUpData.user.id,
            context: "registration_rpc_failure",
            error_message: canonErr.message,
            error_payload: { nutriId, invitationCode, email, correlationId }
          } as any);
        } catch (e) {
          addLog("Falha ao logar erro de runtime.");
        }
        
        toast.error("Ocorreu um erro ao vincular seu perfil. Nossa equipe foi notificada.");
      } else {
        addLog("RPC create_patient_canonical executada com sucesso.");
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

      addLog("Registro concluído com sucesso. Iniciando validação de vínculo crítica...");
      
      // STAGE 1 - HARD FAIL VÍNCULO (CRÍTICO ABSOLUTO)
      const validateLinkage = async (patientId: string) => {
        addLog(`[FJ:LINKAGE] Validando vínculo para ${patientId}...`);
        
        // 1. Validar profiles.tenant_id
        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("user_id", patientId)
          .single();
          
        if (profErr || !profile?.tenant_id) {
          addLog(`[FJ:CRITICAL] profiles.tenant_id null para ${patientId}`);
          return { success: false, reason: "profile_tenant_null" };
        }
        
        // 2. Validar user_tenants EXISTS
        const { data: userTenant, error: utErr } = await supabase
          .from("user_tenants")
          .select("id")
          .eq("user_id", patientId)
          .eq("tenant_id", profile.tenant_id)
          .maybeSingle();
          
        if (utErr || !userTenant) {
          addLog(`[FJ:CRITICAL] user_tenants não encontrado para ${patientId}`);
          return { success: false, reason: "user_tenant_missing" };
        }
        
        // 3. Validar nutritionist_patients EXISTS
        const { data: linkage, error: linkErr } = await supabase
          .from("nutritionist_patients")
          .select("id")
          .eq("patient_id", patientId)
          .eq("nutritionist_id", nutriId)
          .maybeSingle();
          
        if (linkErr || !linkage) {
          addLog(`[FJ:CRITICAL] nutritionist_patients não encontrado para ${patientId}`);
          return { success: false, reason: "linkage_missing" };
        }
        
        addLog("[FJ:LINKAGE] Vínculo validado com sucesso total.");
        return { success: true };
      };

      const linkageResult = await validateLinkage(signUpData.user.id);
      
      if (!linkageResult.success) {
        setLinkageError({
          type: linkageResult.reason || "unknown",
          message: "Ocorreu uma falha crítica ao vincular sua conta ao profissional nutricionista. Por favor, tente novamente ou fale com o suporte."
        });
        setLoading(false);
        return;
      }

      // Se tiver sessão, redireciona explicitamente limpando estados de loading
      if (signUpData.session) {
        setCurrentUserId(signUpData.user.id);
        addLog("Sessão detectada e vínculo garantido. Redirecionando...");
        toast.success("Conta criada e vinculada com sucesso!");
        
        setTimeout(() => {
          setLoading(false);
          navigate("/client/dashboard", { replace: true });
        }, 1000);
        return;
      }


      setCurrentUserId(signUpData.user.id);
      toast.success("Conta criada! Verifique seu e-mail.");
      setDone(true);

      if (nutriId) {
        promptWhatsAppNotification({
          patientId: signUpData.user.id,
          patientName: name,
          professionalName: selectedProfessional?.full_name || "Seu Nutricionista",
          type: "registration_updated",
          appUrl: `${window.location.origin}/auth`,
          clinicName: selectedProfessional?.clinic_name || undefined,
          phone: formattedWhatsapp
        });
      }
    } catch (err: any) {
      addLog(`Erro inesperado: ${err.message}`);
      toast.error("Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };


  // ─── Linkage Error Screen ───
  if (linkageError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
          <div className="mb-6"><FitJourneyLogo size="lg" /></div>
          <Card className="shadow-2xl border-destructive/20 bg-destructive/5 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto border-2 border-destructive/20">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">Erro Crítico de Vínculo 🛑</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {linkageError.message}
                </p>
                <div className="p-3 bg-muted/50 rounded-lg text-[10px] font-mono text-muted-foreground mt-4 break-all">
                  ERROR_CODE: {linkageError.type} | CID: {correlationId}
                </div>
              </div>
              <div className="grid gap-3 pt-4">
                <Button onClick={() => window.location.reload()} className="w-full h-12 gap-2">
                  <RefreshCw className="w-4 h-4" /> Tentar Novamente
                </Button>
                <Button variant="outline" asChild className="w-full h-12">
                  <a href="https://wa.me/suporte_fitjourney" target="_blank" rel="noopener noreferrer">
                    Falar com Suporte
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

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

  if (registrationDisplay.isLinkValidationPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl opacity-50" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl opacity-50" />
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md text-center space-y-4">
          <div className="flex justify-center mb-4"><FitJourneyLogo size="lg" /></div>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
            <CardContent className="pt-12 pb-12 flex flex-col items-center gap-5">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="space-y-2">
                <p className="font-bold text-xl text-foreground">Validando convite...</p>
                <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">
                  Estamos conectando você ao seu profissional. Por favor, aguarde.
                </p>
              </div>
              
              {/* Fallback para evitar ficar preso se a função demorar demais */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-4 text-xs opacity-50 hover:opacity-100"
                onClick={() => {
                  addLog("Usuário optou por ignorar validação (fallback manual).");
                  setSigValid(false);
                }}
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Problemas ao carregar? Clique aqui
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }


  if (registrationDisplay.shouldShowInvitationWelcome && selectedProfessional) {
    const cadastroPath = buildCadastroPath({ preselectedNutri, invitationCode, selectedProfessional });
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
                      data-testid="professional-avatar-img"
                      onError={() => {
                        addLog("Erro ao carregar avatar do nutricionista. Usando fallback.");
                        setAvatarError(true);
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5" data-testid="professional-avatar-fallback">
                      <User className="w-10 h-10 text-primary" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">{INVITATION_TEXTS.WELCOME_TITLE}</h2>
                <div className="space-y-1">
                  <p className="text-muted-foreground">
                    O profissional <strong className="text-primary">{selectedProfessional.full_name}</strong> está pronto para acompanhar você.
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
                <Button onClick={() => {
                  addLog(`Convite aceito; preservando contexto ${cadastroPath}`);
                  setIsProfConfirmed(true);
                }} className="w-full h-12 text-base font-bold gradient-primary shadow-lg shadow-primary/20">
                  {INVITATION_TEXTS.CTA_REGISTER} <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button variant="ghost" onClick={() => navigate(`/auth?next=${encodeURIComponent(cadastroPath)}`)} className="text-muted-foreground hover:text-foreground">
                  {INVITATION_TEXTS.ALREADY_HAS_ACCOUNT}
                </Button>
              </div>
              
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                {INVITATION_TEXTS.AUTOMATIC_LINK_NOTICE}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }



  if (registrationDisplay.routeDecision === "invalid_code_only") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-destructive/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md relative z-10 text-center">
          <div className="mb-8 flex justify-center"><FitJourneyLogo size="lg" /></div>
          <Card className="shadow-2xl border-destructive/20 bg-card/90 backdrop-blur-md">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Convite Inválido ou Expirado</h2>
                <p className="text-muted-foreground text-sm">
                  {invitationIssue?.message || INVITATION_TEXTS.INVALID_LINK_NOTICE}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3 text-left text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">{INVITATION_TEXTS.HOW_TO_GET_LINK.TITLE}</p>
                <p>O link que você usou não é mais válido ou nunca existiu. Por favor, peça um novo convite ao seu profissional.</p>
              </div>

              <div className="grid gap-3">
                <Button asChild variant="outline" className="w-full h-12">
                  <Link to="/auth">{INVITATION_TEXTS.ALREADY_HAS_ACCOUNT}</Link>
                </Button>
                <Button variant="ghost" onClick={() => navigate("/")} className="text-xs text-muted-foreground">
                  Voltar para o Início
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // GUARD: Cadastro de paciente é EXCLUSIVAMENTE via link do profissional.

  if (registrationDisplay.shouldShowNoContextGuard) {
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
                <h1 className="text-2xl font-bold text-foreground">{INVITATION_TEXTS.ERROR_TITLE}</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {INVITATION_TEXTS.ERROR_DESCRIPTION}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3 text-left text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">{INVITATION_TEXTS.HOW_TO_GET_LINK.TITLE}</p>
                <p>{INVITATION_TEXTS.HOW_TO_GET_LINK.STEP1}</p>
                <p>{INVITATION_TEXTS.HOW_TO_GET_LINK.STEP2}</p>
                <p>{INVITATION_TEXTS.HOW_TO_GET_LINK.STEP3}</p>
              </div>

              <Button asChild variant="outline" className="w-full h-12">
                <Link to="/auth">{INVITATION_TEXTS.ALREADY_HAS_ACCOUNT} — Entrar</Link>
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10 space-y-4">
        <div className="flex justify-center mb-6">
          <FitJourneyLogo size="lg" />
        </div>
        
        <Card className="shadow-2xl border-primary/10 bg-card/95 backdrop-blur-md">
          <CardContent className="pt-8 pb-8 space-y-6">
            {selectedProfessional && (
              <div className="flex flex-col items-center gap-4 border-b border-border pb-6 mb-2">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse opacity-50" />
                  <div className="relative w-20 h-20 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center overflow-hidden shadow-lg">
                    {selectedProfessional.avatar_url && !avatarError ? (
                      <img 
                        src={selectedProfessional.avatar_url} 
                        alt={selectedProfessional.full_name} 
                        className="w-full h-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <User className="w-8 h-8 text-primary/60" />
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">Iniciando cadastro com</p>
                  <h3 className="text-lg font-bold text-foreground leading-tight tracking-tight">{selectedProfessional.full_name}</h3>
                  {selectedProfessional.clinic_name && (
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1 font-medium">
                      <Building2 className="w-3 h-3" /> {selectedProfessional.clinic_name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {!selectedProfessional && (
              <div className="text-center space-y-2 pb-4">
                <h1 className="text-2xl font-bold text-foreground">Finalizar Cadastro</h1>
                <p className="text-sm text-muted-foreground">Preencha seus dados para começar.</p>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">

              {registrationDisplay.shouldShowInvalidCodeOnly && (
                <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold">Aviso de Vínculo</p>
                    <p className="text-xs leading-relaxed opacity-90">
                      {invitationIssue?.message || "Não conseguimos validar este código. Peça um novo link ao seu profissional para garantir o vínculo automático."}
                    </p>
                  </div>
                </div>
              )}

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
                  {preselectedNutri || invitationCode ? (
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
                  Já tem conta? <Link to={`/auth?next=${encodeURIComponent(currentCadastroPath)}`} className="text-primary hover:underline font-medium">Entrar agora</Link>
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
          </div>
        )}
      </motion.div>
    </div>
  );
}
