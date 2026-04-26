import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus, Building2, User, ArrowRight, Loader2, AlertCircle, RefreshCw, MessageSquare, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Helmet } from "react-helmet-async";
import { getWhatsAppInvitationMessage, getInvitationUrl } from "@/utils/invitation";



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

  const fetchInvitation = async (showLoading = true) => {
    if (!code) return;
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      const officialDomains = ["lovable.app", "fitjourney.com.br", "localhost", "lovable.dev"];
      const currentDomain = window.location.hostname;
      const isOfficial = officialDomains.some(d => currentDomain.includes(d));

      const { data, error: fetchError } = await supabase
        .from("invitations")
        .select(`
          *,
          professional:profiles!professional_id(full_name, avatar_url),
          clinic:tenants(name)
        `)
        .eq("code", code)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!data) {
        setError("Este link de convite é inválido ou não foi encontrado.");
        return;
      }

      if (!isOfficial) {
        setError("Este link de convite veio de uma origem não autorizada.");
        return;
      }

      const now = new Date();
      const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
      if (expiresAt && now > expiresAt) {
        setInvitation(data);
        setError("Este convite expirou.");
        return;
      }

      if (data.status === 'completed' || data.used_at) {
        setError("Este convite já foi utilizado para concluir um cadastro.");
        return;
      }

      setInvitation(data);
      
      // Log view event
      await supabase.from("invitation_logs").insert({
        invitation_id: data.id,
        event_type: "viewed",
        details: { domain: currentDomain, host: window.location.host },
        user_agent: navigator.userAgent
      });

      if (data.status === 'pending') {
        await supabase
          .from("invitations")
          .update({ status: 'viewed' } as any)
          .eq("id", data.id);
      }

    } catch (err: any) {
      console.error("Error fetching invitation:", err);
      setError("Erro ao validar convite. Tente novamente mais tarde.");
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
        toast.success("Novo convite gerado!");
        navigate(`/convite/${data.code}`, { replace: true });
        // Instead of reload, just let the useEffect handle it
        setIsProcessingAction(false);
      }
    } catch (err: any) {
      console.error("Error regenerating invitation:", err);
      toast.error(err.message || "Erro ao gerar novo convite.");
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


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isOwner = user && invitation && user.id === invitation.professional_id;
  const canRegenerate = isNutritionist && isOwner;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive/20 shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-display font-bold text-foreground">Convite Indisponível</CardTitle>
            <CardDescription className="text-base">{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {canRegenerate ? (
              <>
                <Button 
                  onClick={handleRegenerate} 
                  disabled={isProcessingAction}
                  className="w-full gap-2 h-12 text-lg"
                >
                  {isProcessingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                  Gerar Novo Convite
                </Button>
                {error === "Este convite expirou." && (
                   <Button 
                    variant="outline" 
                    onClick={() => openWhatsApp(`Olá! Seu convite anterior expirou. Aqui está o novo link para o FitJourney: ${window.location.href}`)}
                    className="w-full gap-2 h-12"
                   >
                    <MessageSquare className="w-5 h-5" /> Notificar Paciente (Novo Link)
                   </Button>
                )}
                <Button variant="ghost" onClick={() => fetchInvitation()} className="w-full gap-2">
                  <RefreshCw className="w-4 h-4" /> Tentar Novamente
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => fetchInvitation()} className="w-full h-12 text-lg gap-2">
                  <RefreshCw className="w-5 h-5" /> Tentar Novamente
                </Button>
                <Button variant="outline" onClick={() => navigate("/auth")} className="w-full h-12 text-lg">
                  Ir para Login
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { professional, clinic, patient_name } = invitation;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <Helmet>
        <title>Você foi convidado! | FitJourney</title>
        <meta name="description" content="Seu acompanhamento nutricional de alta performance começa agora." />
        <meta property="og:title" content="Você foi convidado para o FitJourney!" />
        <meta property="og:description" content={`Acompanhamento com ${professional?.full_name || 'seu nutricionista'}`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:image" content={professional?.avatar_url || "/og-image.png"} />
      </Helmet>

      {isOwner && (
        <div className="absolute top-4 right-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/convite/${code}/status`)} className="gap-2 bg-background/80 backdrop-blur-sm">
            <Activity className="w-4 h-4" /> Status
          </Button>
        </div>
      )}

      <Card className="max-w-md w-full border-primary/20 bg-primary/5 shadow-2xl overflow-hidden">
        <div className="h-2 bg-primary animate-pulse" />
        <CardHeader className="text-center space-y-4 pt-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-lg relative">
            <UserPlus className="w-12 h-12 text-primary" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-background rounded-full border border-primary/20 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-display font-bold text-foreground tracking-tight">Você foi convidado!</CardTitle>
            <CardDescription className="text-lg mt-2 font-medium">
              {patient_name ? `Olá, ${patient_name.split(' ')[0]}! ` : ""}
              Seu acompanhamento nutricional começa agora.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pb-10">
          <div className="space-y-4">
            <div className="group flex items-center gap-4 p-5 rounded-2xl bg-background border border-border/50 hover:border-primary/30 transition-all shadow-sm">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Nutricionista</p>
                <p className="text-xl font-bold text-foreground">{professional?.full_name || "Seu Nutricionista"}</p>
              </div>
            </div>

            {clinic && (
              <div className="group flex items-center gap-4 p-5 rounded-2xl bg-background border border-border/50 hover:border-primary/30 transition-all shadow-sm">
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Clínica</p>
                  <p className="text-xl font-bold text-foreground">{clinic.name}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Button 
              onClick={handleAccept} 
              size="lg" 
              className="w-full gap-3 text-xl h-16 rounded-2xl shadow-xl shadow-primary/20"
            >
              Aceitar Convite
              <ArrowRight className="w-6 h-6" />
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => openWhatsApp()} 
              className="w-full h-12 rounded-xl gap-2"
            >
              <MessageSquare className="w-5 h-5" /> Enviar por WhatsApp
            </Button>
            
            <p className="text-[11px] text-center text-muted-foreground px-6 leading-relaxed">
              Ao aceitar, você concorda com nossos termos e será redirecionado para o cadastro seguro.
            </p>
          </div>
        </CardContent>
      </Card>
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
