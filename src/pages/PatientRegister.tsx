import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight, ArrowLeft, CreditCard, QrCode, MessageCircle, CheckCircle2 } from "lucide-react";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";

type Step = "register" | "payment" | "done";

export default function PatientRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") || "";

  const [step, setStep] = useState<Step>("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (error) {
        toast.error(error.message === "User already registered" 
          ? "Este e-mail já está cadastrado. Faça login." 
          : error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        setUserId(data.user.id);

        // Assign patient role and link to nutritionist
        const { error: rpcError } = await supabase.rpc("self_register_patient", {
          _user_id: data.user.id,
          _referral_code: refCode || null,
        });

        if (rpcError) {
          console.error("RPC error:", rpcError);
        }

        // Create profile
        await supabase.from("profiles").upsert({
          user_id: data.user.id,
          full_name: name,
        }, { onConflict: "user_id" });

        toast.success("Conta criada com sucesso!");
        setStep("payment");
      }
    } catch (err) {
      toast.error("Erro ao criar conta. Tente novamente.");
    }
    setLoading(false);
  };

  const handleStripePayment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          plan_id: "default",
          plan_slug: "patient-subscription",
          gateway: "stripe",
          billing_cycle: "monthly",
          amount: 0,
        },
      });

      if (error) throw error;

      if (data?.checkout_url) {
        window.open(data.checkout_url, "_blank");
      } else {
        toast.info(data?.message || "Stripe não configurado. Use PIX por enquanto.");
      }
    } catch {
      toast.error("Erro ao processar pagamento. Tente PIX.");
    }
    setLoading(false);
  };

  const handlePixWhatsApp = () => {
    const message = encodeURIComponent(
      `Olá! Acabei de me cadastrar no FitJourney.\n\nNome: ${name}\nE-mail: ${email}\n\nSegue o comprovante de pagamento PIX.`
    );
    window.open(`https://wa.me/5591980124814?text=${message}`, "_blank");
    toast.success("WhatsApp aberto! Envie o comprovante para confirmar.");
    setStep("done");
  };

  const handleSkipPayment = () => {
    setStep("done");
  };

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="mb-6">
            <FitJourneyLogo size="lg" />
          </div>
          <Card className="shadow-card border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">Cadastro Realizado! 🎉</h2>
                <p className="text-muted-foreground text-sm">
                  Verifique seu e-mail para confirmar a conta. Depois, faça login para iniciar seu onboarding.
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <FitJourneyLogo size="lg" />
          <p className="text-muted-foreground mt-2">
            {step === "register" ? "Crie sua conta de paciente" : "Escolha a forma de pagamento"}
          </p>
        </div>

        <Card className="shadow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              {/* Step indicator */}
              <div className="flex items-center gap-2 w-full">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${step === "register" ? "bg-primary text-primary-foreground" : "bg-emerald-500 text-white"}`}>
                  {step === "register" ? "1" : "✓"}
                </div>
                <div className="h-0.5 flex-1 bg-border rounded">
                  <div className={`h-full rounded transition-all ${step === "payment" ? "w-full bg-primary" : "w-0"}`} />
                </div>
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${step === "payment" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  2
                </div>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-center text-foreground mt-3">
              {step === "register" ? "Criar Conta" : "Pagamento"}
            </h2>
          </CardHeader>

          <CardContent>
            {step === "register" ? (
              <motion.form key="register" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" required />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
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

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando conta..." : (
                    <span className="flex items-center gap-2">Criar Conta <ArrowRight className="w-4 h-4" /></span>
                  )}
                </Button>

                <div className="text-center">
                  <Link to="/auth" className="text-sm text-primary hover:underline">
                    Já tenho conta — fazer login
                  </Link>
                </div>
              </motion.form>
            ) : (
              <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <p className="text-sm text-muted-foreground text-center mb-2">
                  Escolha como deseja realizar o pagamento:
                </p>

                {/* Stripe */}
                <button
                  onClick={handleStripePayment}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <CreditCard className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Cartão de Crédito</p>
                    <p className="text-xs text-muted-foreground">Pagamento seguro via Stripe</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>

                {/* PIX via WhatsApp */}
                <button
                  onClick={handlePixWhatsApp}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <QrCode className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground group-hover:text-emerald-600 transition-colors">PIX</p>
                    <p className="text-xs text-muted-foreground">Envie o comprovante via WhatsApp</p>
                  </div>
                  <MessageCircle className="w-4 h-4 text-emerald-500" />
                </button>

                <div className="pt-2 border-t border-border">
                  <button onClick={handleSkipPayment} className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-2 transition-colors">
                    Pular por agora →
                  </button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {step === "register" && (
          <p className="text-center text-xs text-muted-foreground mt-6">
            Ao criar sua conta, você concorda com os termos de uso.
          </p>
        )}
      </motion.div>
    </div>
  );
}
