import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, CreditCard, Zap, ArrowRight, Shield, Crown, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number | null;
  features: string[];
  max_patients: number | null;
  is_featured: boolean;
}

export default function Pricing() {
  const { user, subscription, checkSubscription } = useAuth();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  // Check subscription on mount and after redirect from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      toast.success("Pagamento realizado com sucesso! 🎉");
      checkSubscription();
      window.history.replaceState({}, "", "/pricing");
    } else if (params.get("payment") === "cancelled") {
      toast.info("Pagamento cancelado.");
      window.history.replaceState({}, "", "/pricing");
    }
  }, []);

  async function loadPlans() {
    const { data } = await supabase
      .from("pricing_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    
    if (data) {
      setPlans(data.map(p => ({
        ...p,
        features: Array.isArray(p.features) ? p.features as string[] : []
      })));
    }
    setLoading(false);
  }

  async function handleSelectPlan(plan: PricingPlan) {
    if (!user) {
      toast.error("Faça login para assinar um plano");
      return;
    }

    if (plan.slug === "free") {
      toast.success("Você já está no plano gratuito!");
      return;
    }

    setProcessingPlan(plan.id);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan_slug: plan.slug },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Erro ao iniciar checkout. Tente novamente.");
    } finally {
      setProcessingPlan(null);
    }
  }

  async function handleManageSubscription() {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Portal error:", err);
      toast.error("Erro ao abrir portal de assinatura.");
    }
  }

  function isCurrentPlan(plan: PricingPlan) {
    if (!subscription.subscribed) return false;
    return subscription.subscription_tier?.toLowerCase() === plan.slug?.toLowerCase() ||
           subscription.subscription_tier?.toLowerCase() === plan.name?.toLowerCase();
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <Badge variant="outline" className="gap-1 px-3 py-1">
            <Sparkles className="w-3 h-3" />
            Planos & Preços
          </Badge>
          <h1 className="text-4xl font-display font-bold">
            Escolha o plano ideal para você
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comece com <strong>3 dias grátis</strong> em qualquer plano. Sem compromisso, cancele quando quiser.
          </p>
        </motion.div>

        {/* Current Subscription Banner */}
        {subscription.subscribed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">
                  Plano {subscription.subscription_tier || "Ativo"}
                  {subscription.is_trial && (
                    <Badge variant="secondary" className="ml-2 text-xs">Trial</Badge>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {subscription.is_trial && subscription.trial_end
                    ? `Trial termina em ${new Date(subscription.trial_end).toLocaleDateString("pt-BR")}`
                    : subscription.subscription_end
                      ? `Próxima cobrança: ${new Date(subscription.subscription_end).toLocaleDateString("pt-BR")}`
                      : "Assinatura ativa"
                  }
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleManageSubscription}>
              <Settings className="w-4 h-4" />
              Gerenciar Assinatura
            </Button>
          </motion.div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const isCurrent = isCurrentPlan(plan);
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
              >
                <Card className={`relative h-full flex flex-col ${
                  isCurrent
                    ? "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    : plan.is_featured 
                      ? "border-primary/50 shadow-glow bg-gradient-to-b from-primary/5 to-transparent" 
                      : "glass"
                }`}>
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-500 text-white">
                        ✓ Seu Plano
                      </Badge>
                    </div>
                  )}
                  {!isCurrent && plan.is_featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground shadow-glow">
                        Mais Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-6">
                    {/* Price */}
                    <div className="text-center">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm text-muted-foreground">R$</span>
                        <span className="text-5xl font-display font-bold">
                          {Math.round(plan.price_monthly)}
                        </span>
                        <span className="text-muted-foreground">/mês</span>
                      </div>
                       {plan.slug !== "free" && (
                        <p className="text-sm text-primary mt-1 font-medium">
                          {subscription.is_trial ? "Assine agora" : "3 dias grátis para testar"}
                        </p>
                      )}
                      {plan.max_patients && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Até {plan.max_patients} pacientes
                        </p>
                      )}
                      {!plan.max_patients && plan.slug !== "free" && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Pacientes ilimitados
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    {isCurrent ? (
                      <Button
                        className="w-full gap-2"
                        variant="outline"
                        size="lg"
                        onClick={handleManageSubscription}
                      >
                        <Settings className="w-4 h-4" />
                        Gerenciar
                      </Button>
                    ) : (
                      <Button
                        className={`w-full gap-2 ${plan.is_featured ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow" : ""}`}
                        variant={plan.is_featured ? "default" : "outline"}
                        size="lg"
                        disabled={processingPlan === plan.id || (subscription.subscribed && !isCurrent)}
                        onClick={() => handleSelectPlan(plan)}
                      >
                        {processingPlan === plan.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Processando...
                          </>
                        ) : plan.slug === "free" ? (
                          "Começar Grátis"
                        ) : subscription.is_trial ? (
                          <>
                            Assinar Agora
                            <ArrowRight className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            Testar Grátis por 3 dias
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-6 py-8 text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="text-sm">Pagamento 100% seguro</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <span className="text-sm">3 dias grátis</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            <span className="text-sm">Cancele quando quiser</span>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
