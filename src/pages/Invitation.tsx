import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus, Building2, User, ArrowRight, Loader2, AlertCircle, RefreshCw, MessageSquare, ExternalLink, ShieldCheck, Terminal, FileQuestion, Clock, UserCheck, Lock, CheckCircle2, Activity } from "lucide-react";
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
  const [errorCode, setErrorCode] = useState<string | null>(null);
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
    setErrorCode(null);
    setInvitation(null);
    
    console.log("[Invitation] Validating code via edge function:", code);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("validate-invitation", {
        body: { code }
      });

      if (invokeError) {
        console.error("[Invitation] Edge function error:", invokeError);
        setError("Ocorreu um erro técnico ao validar seu convite. Por favor, tente novamente.");
        return;
      }

      if (!data.success) {
        console.warn("[Invitation] Validation failed:", data.error_code, data.message);
        
        // Se o convite expirou, ainda podemos ter dados do profissional para mostrar
        if (data.invitation) {
          setInvitation(data.invitation);
        }
        
        setErrorCode(data.error_code);
        setError(data.message);
        return;
      }

      setInvitation(data.invitation);
      console.log("[Invitation] Data loaded successfully:", data.invitation.patient_name);

    } catch (err: any) {
      console.error("[Invitation] Fatal error fetching invitation:", err);
      setError("Ocorreu um erro inesperado. Por favor, tente recarregar a página.");
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

  const InvitationDebug = () => {
    const [testResult, setTestResult] = useState<string | null>(null);

    const runSelfTest = () => {
      const gUrl = getInvitationUrl(code || "TEST-CODE");
      const msg = getWhatsAppInvitationMessage({
        patientName: "Teste",
        professionalName: "Nutri Teste",
        invitationCode: code || "TEST-CODE"
      });
      
      const pass = msg.includes(gUrl) && (isPreview ? gUrl.includes(window.location.hostname) : gUrl.includes(OFFICIAL_DOMAIN));
      setTestResult(pass ? "✅ TESTE PASSOU: URL e WhatsApp estão sincronizados!" : "❌ TESTE FALHOU: URL inconsistente.");
      
      console.log("[Self-Test]", { gUrl, msg, pass });
    };

    return (
      <div className="mt-8 p-4 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs space-y-2 border border-slate-700 shadow-2xl max-w-md w-full animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
          <span className="flex items-center gap-2 text-primary font-bold"><Terminal className="w-4 h-4" /> DIAGNÓSTICO DE AMBIENTE</span>
          <button onClick={() => setShowDebug(false)} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <p><span className="text-slate-400">Ambiente Atual:</span> {isPreview ? "PREVIEW (Lovable/Local)" : "PRODUÇÃO"}</p>
        <p><span className="text-slate-400">Hostname:</span> {window.location.hostname}</p>
        <p><span className="text-slate-400">URL Gerada:</span> {getInvitationUrl(code || "")}</p>
        <p><span className="text-slate-400">BASE_URL (Config):</span> {BASE_URL}</p>
        
        <div className="pt-2 border-t border-slate-700 mt-2">
          <Button size="sm" variant="secondary" onClick={runSelfTest} className="w-full h-8 text-[10px] bg-slate-800 hover:bg-slate-700 text-white">
            Executar Teste de Lógica de Link
          </Button>
          {testResult && (
            <p className={`mt-2 p-2 rounded ${testResult.includes("✅") ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"}`}>
              {testResult}
            </p>
          )}
        </div>
        
        <div className="pt-2 border-t border-slate-700 text-[10px] text-slate-500">
          * Este painel só é visível em ambientes de teste/preview.
        </div>
      </div>
    );
  };


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
    const getErrorDetails = () => {
      switch (errorCode) {
        case "INVALID_CODE":
          return {
            icon: <FileQuestion className="w-10 h-10 text-destructive" />,
            title: "Convite não encontrado",
            step: "Verifique se você copiou o link corretamente ou peça um novo link ao seu nutricionista."
          };
        case "EXPIRED":
          return {
            icon: <Clock className="w-10 h-10 text-destructive" />,
            title: "Convite expirado",
            step: "Este link tinha um prazo de validade que já passou. Peça ao seu nutricionista para gerar um novo convite."
          };
        case "ALREADY_USED":
          return {
            icon: <UserCheck className="w-10 h-10 text-destructive" />,
            title: "Convite já utilizado",
            step: "Este convite já serviu para criar uma conta. Se você já tem acesso, faça login com seu e-mail e senha."
          };
        case "ERRO_PERMISSAO":
          return {
            icon: <Lock className="w-10 h-10 text-destructive" />,
            title: "Acesso restrito",
            step: "Você não tem permissão para acessar este convite. Certifique-se de estar usando o link oficial enviado para você."
          };
        default:
          return {
            icon: <AlertCircle className="w-10 h-10 text-destructive" />,
            title: "Convite Indisponível",
            step: "Não foi possível validar seu convite no momento. Tente recarregar a página ou entre em contato com o suporte."
          };
      }
    };

    const details = getErrorDetails();

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive/20 shadow-2xl bg-destructive/5 overflow-hidden">
          <div className="h-1.5 bg-destructive w-full" />
          <CardHeader className="text-center space-y-4 pt-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-2 border-4 border-background shadow-sm">
              {details.icon}
            </div>
            <div>
              <CardTitle className="text-2xl font-display font-bold text-foreground tracking-tight">
                {details.title}
              </CardTitle>
              <CardDescription className="text-base mt-2 leading-relaxed text-balance">
                {error}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pb-8">
            <div className="p-4 rounded-xl bg-background border border-border shadow-sm mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                <ArrowRight className="w-3 h-3 text-primary" /> Passo recomendado
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {details.step}
              </p>
            </div>

            {canRegenerate ? (
              <>
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-2">
                  <p className="font-bold flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4" /> Painel do Nutricionista
                  </p>
                  Como você é o profissional responsável, pode gerar um novo código agora.
                </div>
                <Button 
                  onClick={handleRegenerate} 
                  disabled={isProcessingAction}
                  className="w-full gap-2 h-14 text-lg font-bold shadow-lg shadow-primary/20"
                >
                  {isProcessingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                  Gerar Novo Código
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => fetchInvitation()} className="w-full h-14 text-lg gap-2 font-bold shadow-lg shadow-primary/10">
                  <RefreshCw className="w-5 h-5" /> Tentar Validar Novamente
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => navigate("/auth")} className="h-12 text-sm font-medium">
                    Fazer Login
                  </Button>
                  <Button variant="ghost" onClick={() => navigate("/")} className="h-12 text-sm">
                    Ir para o Início
                  </Button>
                </div>
              </>
            )}
            
            <p className="text-[10px] text-center text-muted-foreground mt-4 italic">
              Código de erro: <span className="font-mono">{errorCode || "UNKNOWN"}</span>
            </p>
          </CardContent>
        </Card>
        
        {isPreview && !showDebug && (
          <Button variant="ghost" size="sm" onClick={() => setShowDebug(true)} className="mt-8 text-muted-foreground/40 hover:text-muted-foreground">
            <Terminal className="w-4 h-4 mr-2" /> Abrir Ferramentas de Debug
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

