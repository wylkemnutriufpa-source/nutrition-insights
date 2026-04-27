import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus, Building2, User, ArrowRight, Loader2, AlertCircle, RefreshCw, MessageSquare, ExternalLink, ShieldCheck, Terminal } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Helmet } from "react-helmet-async";
import { getWhatsAppInvitationMessage, getInvitationUrl } from "@/utils/invitation";
import { BASE_URL, OFFICIAL_DOMAIN } from "@/lib/config";

export default function Invitation() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNutritionist, setIsNutritionist] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const isPreview = window.location.hostname.includes("lovable") || window.location.hostname.includes("localhost");

  const fetchInvitation = async (showLoading = true) => {
    if (!code) {
      console.warn("[Invitation] No code provided in URL params");
      return;
    }
    
    if (showLoading) setLoading(true);
    setError(null);
    
    console.log("[Invitation] Validating code:", code, "on domain:", window.location.hostname);
    
    try {
      const currentDomain = window.location.hostname;
      
      // Permitir domínios oficiais e previews do Lovable
      const isOfficial = [OFFICIAL_DOMAIN, "fitjourney.com.br"].some(d => currentDomain.includes(d));
      const isAllowedPreview = currentDomain.includes("lovable") || currentDomain.includes("localhost");

      const { data, error: fetchError } = await supabase
        .from("invitations")
        .select(`
          *,
          professional:profiles!professional_id(full_name, avatar_url),
          clinic:tenants(name)
        `)
        .eq("code", code)
        .maybeSingle();

      if (fetchError) {
        console.error("[Invitation] Supabase error:", fetchError);
        throw fetchError;
      }
      
      if (!data) {
        console.error("[Invitation] Code not found in database:", code);
        setError("Este link de convite é inválido ou não foi encontrado em nossa base de dados.");
        return;
      }

      if (!isOfficial && !isAllowedPreview) {
        console.warn("[Invitation] Unauthorized domain access attempt:", currentDomain);
        setError("Este link de convite veio de uma origem não autorizada para sua segurança.");
        return;
      }

      const now = new Date();
      const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
      if (expiresAt && now > expiresAt) {
        console.warn("[Invitation] Invitation expired at:", expiresAt);
        setInvitation(data);
        setError("Este convite expirou. Por favor, solicite um novo link ao seu nutricionista.");
        return;
      }

      if (data.status === 'completed' || data.used_at) {
        console.warn("[Invitation] Invitation already used");
        setError("Este convite já foi utilizado para concluir um cadastro anteriormente.");
        return;
      }

      setInvitation(data);
      console.log("[Invitation] Data loaded successfully:", data.patient_name);
      
      // Log view event
      await supabase.from("invitation_logs").insert({
        invitation_id: data.id,
        event_type: "viewed",
        details: { 
          domain: currentDomain, 
          host: window.location.host,
          environment: isPreview ? "preview" : "production" 
        },
        user_agent: navigator.userAgent,
        professional_id: data.professional_id,
        patient_email: data.patient_email
      });

      if (data.status === 'pending') {
        await supabase
          .from("invitations")
          .update({ status: 'viewed' } as any)
          .eq("id", data.id);
      }

    } catch (err: any) {
      console.error("[Invitation] Fatal error fetching invitation:", err);
      setError("Ocorreu um erro ao validar seu convite. Por favor, tente recarregar a página.");
    } finally {
      setLoading(false);
      setIsValidating(false);
    }
  };

  useEffect(() => {
    async function checkRole() {
      if (!user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "nutritionist")
        .maybeSingle();
      if (data) setIsNutritionist(true);
    }
    checkRole();
  }, [user]);

  useEffect(() => {
    fetchInvitation();
  }, [code]);

  const handleAccept = () => {
    if (!invitation || error || isProcessingAction) return;
    setIsProcessingAction(true);
    navigate(`/cadastro?nutri=${invitation.professional_id}&code=${code}`);
  };

  const handleRegenerate = async () => {
    if (!user || !invitation || isProcessingAction) return;
    
    setIsProcessingAction(true);
    try {
      const { data, error: genError } = await supabase.functions.invoke("create-invitation", {
        body: { 
          patient_name: invitation.patient_name,
          patient_email: invitation.patient_email,
          tenant_id: invitation.tenant_id,
          old_code: code
        }
      });

      if (genError) throw genError;
      
      if (data?.code) {
        toast.success("Novo convite gerado com sucesso!");
        navigate(`/convite/${data.code}`, { replace: true });
        setIsProcessingAction(false);
      }
    } catch (err: any) {
      console.error("[Invitation] Error regenerating invitation:", err);
      toast.error("Erro ao gerar novo convite. Tente novamente.");
      setIsProcessingAction(false);
    }
  };


  const openWhatsApp = (customMessage?: string) => {
    if (!invitation) return;
    
    const message = customMessage || getWhatsAppInvitationMessage({
      patientName: invitation.patient_name || "",
      professionalName: invitation.professional?.full_name || "Seu Nutricionista",
      clinicName: invitation.clinic?.name,
      invitationCode: code || ""
    });

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const InvitationDebug = () => (
    <div className="mt-8 p-4 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs space-y-2 border border-slate-700 shadow-2xl max-w-md w-full animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
        <span className="flex items-center gap-2 text-primary font-bold"><Terminal className="w-4 h-4" /> DEBUG PREVIEW</span>
        <button onClick={() => setShowDebug(false)} className="text-slate-400 hover:text-white">✕</button>
      </div>
      <p><span className="text-slate-400">Hostname:</span> {window.location.hostname}</p>
      <p><span className="text-slate-400">Origin:</span> {window.location.origin}</p>
      <p><span className="text-slate-400">BASE_URL:</span> {BASE_URL}</p>
      <p><span className="text-slate-400">OFFICIAL_DOMAIN:</span> {OFFICIAL_DOMAIN}</p>
      <p><span className="text-slate-400">Invite Code:</span> {code}</p>
      <p><span className="text-slate-400">Generated URL:</span> {getInvitationUrl(code || "")}</p>
      <p><span className="text-slate-400">Status:</span> {invitation?.status || 'N/A'}</p>
      <div className="pt-2 border-t border-slate-700">
        <p className="text-amber-400 font-bold">Validação de Ambiente:</p>
        <p>• Preview: {isPreview ? "SIM ✅" : "NÃO ❌"}</p>
        <p>• Oficial: {[OFFICIAL_DOMAIN, "fitjourney.com.br"].some(d => window.location.hostname.includes(d)) ? "SIM ✅" : "NÃO ❌"}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse font-medium">Validando seu convite...</p>
        </div>
      </div>
    );
  }

  const isOwner = user && invitation && user.id === invitation.professional_id;
  const canRegenerate = isNutritionist && isOwner;

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive/20 shadow-2xl bg-destructive/5 overflow-hidden">
          <div className="h-1.5 bg-destructive w-full" />
          <CardHeader className="text-center space-y-4 pt-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-2 border-4 border-background shadow-sm">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-2xl font-display font-bold text-foreground tracking-tight">Convite Indisponível</CardTitle>
              <CardDescription className="text-base mt-2 leading-relaxed">
                {error}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pb-8">
            {canRegenerate ? (
              <>
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-2">
                  <p className="font-bold flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4" /> Admin Nutricionista
                  </p>
                  Você é o dono deste convite. Você pode gerar um novo código para o paciente agora mesmo.
                </div>
                <Button 
                  onClick={handleRegenerate} 
                  disabled={isProcessingAction}
                  className="w-full gap-2 h-14 text-lg font-bold shadow-lg shadow-primary/20"
                >
                  {isProcessingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                  Gerar Novo Convite
                </Button>
                 {error.includes("expirou") && (
                    <Button 
                     variant="outline" 
                     onClick={() => openWhatsApp(`Olá! Seu convite anterior para o FitJourney expirou. Aqui está o novo link atualizado para você começar seu acompanhamento: ${getInvitationUrl(code || "")}`)}
                     className="w-full gap-2 h-12"
                    >
                     <MessageSquare className="w-5 h-5" /> Notificar Paciente via WhatsApp
                    </Button>
                )}
              </>
            ) : (
              <>
                <Button onClick={() => fetchInvitation()} className="w-full h-14 text-lg gap-2 font-bold shadow-lg shadow-primary/10">
                  <RefreshCw className="w-5 h-5" /> Tentar Validar Novamente
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => navigate("/auth")} className="h-12 text-sm font-medium">
                    Ir para Login
                  </Button>
                  <Button variant="ghost" onClick={() => navigate("/")} className="h-12 text-sm">
                    Ir para o Início
                  </Button>
                </div>
              </>
            )}
            
            <p className="text-[10px] text-center text-muted-foreground mt-4 italic">
              Se você acredita que isso é um erro, entre em contato com seu nutricionista ou com o suporte do FitJourney.
            </p>
          </CardContent>
        </Card>
        
        {isPreview && !showDebug && (
          <Button variant="ghost" size="sm" onClick={() => setShowDebug(true)} className="mt-8 text-muted-foreground/40 hover:text-muted-foreground">
            <Terminal className="w-4 h-4 mr-2" /> Debug Preview
          </Button>
        )}
        
        {showDebug && <InvitationDebug />}
      </div>
    );
  }

  const { professional, clinic, patient_name } = invitation;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative">
      <Helmet>
        <title>Você foi convidado! | FitJourney</title>
        <meta name="description" content="Seu acompanhamento nutricional de alta performance começa agora." />
        <meta property="og:title" content="Você foi convidado para o FitJourney!" />
        <meta property="og:description" content={`Acompanhamento com ${professional?.full_name || 'seu nutricionista'}`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={getInvitationUrl(code || "")} />
        <meta property="og:image" content={professional?.avatar_url || "/og-image.png"} />
      </Helmet>

      {isOwner && (
        <div className="absolute top-4 right-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/convite/${code}/status`)} className="gap-2 bg-background/80 backdrop-blur-sm hover:bg-background">
            <Activity className="w-4 h-4" /> Painel de Status
          </Button>
        </div>
      )}

      <Card className="max-w-md w-full border-primary/20 bg-primary/5 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="h-2 bg-primary animate-pulse" />
        <CardHeader className="text-center space-y-4 pt-8 pb-4">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-xl relative group">
            <UserPlus className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-background rounded-full border border-primary/20 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-display font-bold text-foreground tracking-tight">Você foi convidado!</CardTitle>
            <CardDescription className="text-lg mt-2 font-medium text-muted-foreground/80">
              {patient_name ? `Olá, ${patient_name.split(' ')[0]}! ` : ""}
              Seu acompanhamento nutricional começa agora.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pb-10">
          <div className="space-y-3">
            <div className="group flex items-center gap-4 p-5 rounded-2xl bg-background border border-border/50 hover:border-primary/30 transition-all shadow-sm hover:shadow-md">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Nutricionista</p>
                <p className="text-xl font-bold text-foreground">{professional?.full_name || "Seu Nutricionista"}</p>
              </div>
            </div>

            {clinic && (
              <div className="group flex items-center gap-4 p-5 rounded-2xl bg-background border border-border/50 hover:border-primary/30 transition-all shadow-sm hover:shadow-md">
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Building2 className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Clínica</p>
                  <p className="text-xl font-bold text-foreground">{clinic.name}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <Button 
              onClick={handleAccept} 
              size="lg" 
              className="w-full gap-3 text-xl h-16 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Aceitar Convite
              <ArrowRight className="w-6 h-6" />
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => openWhatsApp()} 
              className="w-full h-12 rounded-xl gap-2 font-semibold border-primary/20 text-primary hover:bg-primary/5"
            >
              <MessageSquare className="w-5 h-5" /> Enviar por WhatsApp
            </Button>
            
            <div className="flex flex-col gap-1">
              <p className="text-[11px] text-center text-muted-foreground px-6 leading-relaxed">
                Ao aceitar, você concorda com nossos termos e será redirecionado para o cadastro seguro.
              </p>
              {isPreview && (
                <div className="mt-4 flex justify-center">
                   <Button variant="ghost" size="sm" onClick={() => setShowDebug(!showDebug)} className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground uppercase tracking-widest">
                    {showDebug ? "Ocultar Debug" : "Ver Debug (Preview)"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {showDebug && <InvitationDebug />}
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function Activity(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
