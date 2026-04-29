import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  UserPlus, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck,
  Smartphone,
  Mail,
  Lock,
  User,
  Sparkles
} from "lucide-react";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import { formatInternationalWhatsApp, validateWhatsApp as sharedValidateWhatsApp } from "@/utils/whatsapp";

export default function QuickLink() {
  const { nutriId } = useParams();
  const navigate = useNavigate();
  
  const [professional, setProfessional] = useState<{ full_name: string; clinic_name: string | null } | null>(null);
  const [loadingProf, setLoadingProf] = useState(true);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!nutriId) return;
    
    // Captura de intenção determinística (Regra 1 do Onboarding)
    localStorage.setItem("fj_invited", "true");
    localStorage.setItem("fj_user_type", "patient");
    if (nutriId) {
      localStorage.setItem("fitjourney_nutri_id", nutriId);
    }
    
    const fetchProf = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", nutriId)
        .maybeSingle();
        
      const { data: profProfile } = await supabase
        .from("professional_profiles")
        .select("clinic_name")
        .eq("user_id", nutriId)
        .maybeSingle();
        
      if (profile) {
        setProfessional({
          full_name: profile.full_name,
          clinic_name: profProfile?.clinic_name || null
        });
      }
      setLoadingProf(false);
    };
    
    fetchProf();
  }, [nutriId]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    if (!name || !email || !whatsapp || !password) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    const { isValid, error } = sharedValidateWhatsApp(whatsapp);
    if (!isValid) {
      toast.error(error || "WhatsApp inválido.");
      return;
    }

    setLoading(true);
    try {
      const formattedWhatsapp = formatInternationalWhatsApp(whatsapp);
      
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Falha ao criar usuário.");

      // 2. Link to professional using RPC
      const { error: rpcError } = await supabase.rpc("create_patient_canonical", {
        _patient_id: authData.user.id,
        _full_name: name,
        _email: email.trim().toLowerCase(),
        _whatsapp: formattedWhatsapp,
        _nutritionist_id: nutriId,
        _source: "register",
        _metadata: { quick_link: true }
      } as any);

      if (rpcError) {
        console.error("RPC Error:", rpcError);
        // Fallback for profile creation if RPC fails (though it shouldn't)
        await supabase.from("profiles").update({ 
          full_name: name,
          whatsapp: formattedWhatsapp
        } as any).eq("id", authData.user.id);
      }

      // 3. Notify professional
      await supabase.from("notifications").insert({
        user_id: nutriId,
        title: "Novo paciente via Link Rápido",
        message: `${name} acabou de se cadastrar.`,
        type: "patient_registered",
        entity_type: "patient",
        entity_id: authData.user.id,
      } as any);

      toast.success("Cadastro realizado com sucesso!");
      setDone(true);
      
      // If auto-logged in, we can redirect. Otherwise, wait for email confirm.
      if (authData.session) {
        setTimeout(() => navigate("/consent"), 1500);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao realizar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center space-y-6"
        >
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold font-display">Tudo pronto!</h1>
          <p className="text-muted-foreground">
            Seu cadastro foi realizado com sucesso. Agora você faz parte da jornada com {professional?.full_name}.
          </p>
          <div className="pt-4">
            <Button asChild className="w-full h-12 text-base font-semibold gradient-primary shadow-glow">
              <Link to="/auth">
                Ir para o Painel <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <FitJourneyLogo size="lg" />
            </div>
            <h1 className="text-2xl font-bold font-display tracking-tight">Comece sua Jornada</h1>
            {loadingProf ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Localizando profissional...</span>
              </div>
            ) : professional ? (
              <p className="text-muted-foreground text-sm">
                Você está se vinculando a <span className="text-foreground font-semibold">{professional.full_name}</span>
                {professional.clinic_name && <> ({professional.clinic_name})</>}
              </p>
            ) : (
              <p className="text-destructive text-sm font-medium">Link de profissional não encontrado.</p>
            )}
          </div>

          <Card className="border-border/50 shadow-xl shadow-primary/5 bg-card/80 backdrop-blur-xl">
            <CardContent className="pt-8 space-y-6">
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> Nome Completo
                  </Label>
                  <Input 
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Como deseja ser chamado?"
                    className="h-12 bg-muted/30 border-border/50 focus:border-primary/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </Label>
                  <Input 
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-12 bg-muted/30 border-border/50 focus:border-primary/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5" /> WhatsApp
                  </Label>
                  <Input 
                    id="whatsapp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="h-12 bg-muted/30 border-border/50 focus:border-primary/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pass" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" /> Senha de Acesso
                  </Label>
                  <Input 
                    id="pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="h-12 bg-muted/30 border-border/50 focus:border-primary/50"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={loading || !professional}
                  className="w-full h-12 text-base font-semibold gradient-primary shadow-glow transition-all active:scale-[0.98]"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Criar Conta e Começar <Sparkles className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center space-y-4">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 
              Seus dados estão protegidos com criptografia de ponta.
            </p>
            <div className="pt-2">
              <Link to="/auth" className="text-sm text-primary hover:underline font-medium">
                Já possui uma conta? Entre aqui
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-8 text-center text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium opacity-50">
        Powered by FitJourney Intelligent Systems
      </footer>
    </div>
  );
}
