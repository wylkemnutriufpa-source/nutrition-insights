import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { transitionJourneyStatus } from "@/lib/serverTransitions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Eye, EyeOff, ArrowRight, ArrowLeft, CreditCard, QrCode,
  MessageCircle, CheckCircle2, Search, User, Stethoscope, Loader2
} from "lucide-react";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";

type Step = "has_professional" | "register" | "payment_question" | "payment" | "done";

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

  const [step, setStep] = useState<Step>(preselectedNutri ? "register" : "has_professional");
  const [hasProfessional, setHasProfessional] = useState<"yes" | "no" | "">("");

  // Professional search
  const [profSearch, setProfSearch] = useState("");
  const [profResults, setProfResults] = useState<ProfessionalResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalResult | null>(null);

  // Registration
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Payment
  const [alreadyPaid, setAlreadyPaid] = useState<"yes" | "no" | "">("");

  // Pre-select professional from URL
  useEffect(() => {
    if (!preselectedNutri) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, phone")
        .eq("user_id", preselectedNutri)
        .maybeSingle();
      if (data) {
        setSelectedProfessional({
          user_id: data.user_id,
          full_name: data.full_name,
          avatar_url: data.avatar_url,
          clinic_name: null,
          phone: data.phone,
        });
      }
    })();
  }, [preselectedNutri]);

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
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

        // Register as patient and link to nutritionist if selected
        const nutriId = selectedProfessional?.user_id || null;
        const { error: rpcError } = await supabase.rpc("self_register_patient", {
          _user_id: data.user.id,
          _referral_code: refCode || null,
        });
        if (rpcError) console.error("RPC error:", rpcError);

        // Create profile with phone
        await supabase.from("profiles").upsert({
          user_id: data.user.id,
          full_name: name,
          phone: phone || null,
        }, { onConflict: "user_id" });

        // If professional selected, update journey_status via server-authoritative RPC
        if (nutriId) {
          await transitionJourneyStatus(data.user.id, nutriId, "lead_created").catch(() => {
            // Fallback: direct update for fresh registrations where status may not exist yet
            supabase
              .from("nutritionist_patients")
              .update({ journey_status: "lead_created" } as any)
              .eq("patient_id", data.user.id)
              .eq("nutritionist_id", nutriId);
          });

          // Notify the professional
          await supabase.from("notifications").insert({
            user_id: nutriId,
            title: "Novo paciente cadastrado",
            message: `${name} se cadastrou e vinculou ao seu perfil. Aguardando ativação.`,
            type: "patient_registered",
            entity_type: "patient",
            entity_id: data.user.id,
            target_route: `/patients/${data.user.id}`,
          } as any);
        }

        toast.success("Conta criada com sucesso!");
        setStep("payment_question");
      }
    } catch {
      toast.error("Erro ao criar conta. Tente novamente.");
    }
    setLoading(false);
  };

  const handlePaymentDecision = async () => {
    if (!userId || !selectedProfessional) return;

    if (alreadyPaid === "yes") {
      await transitionJourneyStatus(userId, selectedProfessional.user_id, "awaiting_onboarding_release").catch(() => {
        supabase.from("nutritionist_patients").update({ journey_status: "awaiting_onboarding_release" } as any)
          .eq("patient_id", userId).eq("nutritionist_id", selectedProfessional.user_id);
      });
      setStep("done");
    } else {
      await transitionJourneyStatus(userId, selectedProfessional.user_id, "awaiting_payment").catch(() => {
        supabase.from("nutritionist_patients").update({ journey_status: "awaiting_payment" } as any)
          .eq("patient_id", userId).eq("nutritionist_id", selectedProfessional.user_id);
      });
      setStep("payment");
    }
  };

  const handleWhatsAppReceipt = () => {
    const profPhone = selectedProfessional?.phone?.replace(/\D/g, "") || "5591980124814";
    const message = encodeURIComponent(
      `Olá! Acabei de me cadastrar no FitJourney.\n\nNome: ${name}\nE-mail: ${email}\n\nSegue o comprovante de pagamento.`
    );
    window.open(`https://wa.me/${profPhone}?text=${message}`, "_blank");
    toast.success("WhatsApp aberto! Envie o comprovante para confirmar.");
    setStep("done");
  };

  const handleStripePayment = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan_slug: "basic" },
      });
      if (error) throw error;
      if (data?.url) {
        // Update to onboarding_active will happen via webhook/manual
        window.open(data.url, "_blank");
        toast.info("Após o pagamento, seu onboarding será liberado automaticamente.");
        setStep("done");
      } else {
        toast.info("Checkout não disponível. Use PIX por enquanto.");
      }
    } catch {
      toast.error("Erro ao iniciar pagamento. Tente PIX.");
    }
    setLoading(false);
  };

  const handleSkipPayment = async () => {
    setStep("done");
  };

  // Current step number for progress bar
  const stepOrder: Step[] = ["has_professional", "register", "payment_question", "payment", "done"];
  const currentIdx = stepOrder.indexOf(step);

  // ─── Step: Done ───
  if (step === "done") {
    const waitingRelease = alreadyPaid === "yes";
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
                  {waitingRelease
                    ? "Verifique seu e-mail para confirmar a conta. Seu profissional irá validar o pagamento e liberar seu onboarding."
                    : "Verifique seu e-mail para confirmar a conta. Depois, faça login para acompanhar seu status."
                  }
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
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <FitJourneyLogo size="lg" />
          <p className="text-muted-foreground mt-2 text-sm text-center">
            {step === "has_professional" && "Crie sua conta de paciente"}
            {step === "register" && "Preencha seus dados"}
            {step === "payment_question" && "Status do pagamento"}
            {step === "payment" && "Escolha a forma de pagamento"}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-6 px-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= currentIdx ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <Card className="shadow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6 pb-6">
            <AnimatePresence mode="wait">

              {/* ─── Step 1: Has Professional? ─── */}
              {step === "has_professional" && (
                <motion.div key="has_prof" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                  <div className="text-center">
                    <Stethoscope className="w-10 h-10 text-primary mx-auto mb-3 opacity-80" />
                    <h2 className="text-lg font-semibold text-foreground">Você já possui um profissional na plataforma?</h2>
                  </div>

                  <RadioGroup value={hasProfessional} onValueChange={(v) => setHasProfessional(v as "yes" | "no")} className="space-y-3">
                    <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${hasProfessional === "yes" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                      <RadioGroupItem value="yes" />
                      <div>
                        <p className="font-medium text-foreground">Sim</p>
                        <p className="text-xs text-muted-foreground">Vou buscar meu profissional</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${hasProfessional === "no" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                      <RadioGroupItem value="no" />
                      <div>
                        <p className="font-medium text-foreground">Não</p>
                        <p className="text-xs text-muted-foreground">Quero me cadastrar sem vínculo</p>
                      </div>
                    </label>
                  </RadioGroup>

                  {/* Professional search */}
                  {hasProfessional === "yes" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={profSearch}
                          onChange={(e) => setProfSearch(e.target.value)}
                          placeholder="Digite o nome do profissional (mín. 2 letras)"
                          className="pl-10"
                        />
                      </div>

                      {searchLoading && (
                        <div className="flex items-center justify-center py-3">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      )}

                      {profResults.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {profResults.map(prof => (
                            <button
                              key={prof.user_id}
                              onClick={() => setSelectedProfessional(prof)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                                selectedProfessional?.user_id === prof.user_id
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                  : "border-border hover:border-primary/30"
                              }`}
                            >
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                {prof.avatar_url ? (
                                  <img src={prof.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                  <span className="text-sm font-bold text-primary">{prof.full_name?.[0]?.toUpperCase()}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground text-sm truncate">{prof.full_name}</p>
                                {prof.clinic_name && <p className="text-xs text-muted-foreground truncate">{prof.clinic_name}</p>}
                              </div>
                              {selectedProfessional?.user_id === prof.user_id && (
                                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 ml-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {profSearch.length >= 2 && !searchLoading && profResults.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-3">Nenhum profissional encontrado</p>
                      )}
                    </motion.div>
                  )}

                  <Button
                    onClick={() => setStep("register")}
                    disabled={hasProfessional === "yes" && !selectedProfessional}
                    className="w-full"
                  >
                    Continuar <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* ─── Step 2: Registration ─── */}
              {step === "register" && (
                <motion.form key="register" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleRegister} className="space-y-4">
                  {selectedProfessional && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Stethoscope className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Profissional selecionado</p>
                        <p className="font-medium text-sm text-foreground truncate">{selectedProfessional.full_name}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="name">Nome completo</Label>
                    <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" required />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone / WhatsApp</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
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

                  <div className="flex gap-2">
                    {!preselectedNutri && (
                      <Button type="button" variant="outline" onClick={() => setStep("has_professional")} className="shrink-0">
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    )}
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? "Criando conta..." : (
                        <span className="flex items-center gap-2">Criar Conta <ArrowRight className="w-4 h-4" /></span>
                      )}
                    </Button>
                  </div>

                  <div className="text-center">
                    <Link to="/auth" className="text-sm text-primary hover:underline">
                      Já tenho conta — fazer login
                    </Link>
                  </div>
                </motion.form>
              )}

              {/* ─── Step 3: Payment Question ─── */}
              {step === "payment_question" && (
                <motion.div key="pay_q" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                  <div className="text-center">
                    <CreditCard className="w-10 h-10 text-primary mx-auto mb-3 opacity-80" />
                    <h2 className="text-lg font-semibold text-foreground">Você já realizou o pagamento do acompanhamento?</h2>
                  </div>

                  <RadioGroup value={alreadyPaid} onValueChange={(v) => setAlreadyPaid(v as "yes" | "no")} className="space-y-3">
                    <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${alreadyPaid === "yes" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                      <RadioGroupItem value="yes" />
                      <div>
                        <p className="font-medium text-foreground">Sim, já paguei</p>
                        <p className="text-xs text-muted-foreground">Vou enviar comprovante ao profissional</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${alreadyPaid === "no" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                      <RadioGroupItem value="no" />
                      <div>
                        <p className="font-medium text-foreground">Não, quero pagar agora</p>
                        <p className="text-xs text-muted-foreground">Escolher forma de pagamento</p>
                      </div>
                    </label>
                  </RadioGroup>

                  {alreadyPaid === "yes" && selectedProfessional && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                      <p className="text-sm text-foreground">
                        Envie seu comprovante para <strong>{selectedProfessional.full_name}</strong> via WhatsApp:
                      </p>
                      <Button onClick={handleWhatsAppReceipt} variant="outline" className="w-full gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10">
                        <MessageCircle className="w-4 h-4" /> Enviar comprovante via WhatsApp
                      </Button>
                    </motion.div>
                  )}

                  <Button
                    onClick={handlePaymentDecision}
                    disabled={!alreadyPaid || (alreadyPaid === "yes" && !selectedProfessional)}
                    className="w-full"
                  >
                    Continuar <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  {!selectedProfessional && (
                    <button onClick={() => setStep("done")} className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1 transition-colors">
                      Pular por agora →
                    </button>
                  )}
                </motion.div>
              )}

              {/* ─── Step 4: Payment ─── */}
              {step === "payment" && (
                <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center mb-2">
                    Escolha como deseja realizar o pagamento:
                  </p>

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

                  <button
                    onClick={handleWhatsAppReceipt}
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

            </AnimatePresence>
          </CardContent>
        </Card>

        {step === "has_professional" && (
          <p className="text-center text-xs text-muted-foreground mt-6">
            Ao criar sua conta, você concorda com os termos de uso.
          </p>
        )}
      </motion.div>
    </div>
  );
}
