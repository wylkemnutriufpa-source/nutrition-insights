import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Sparkles, CreditCard, QrCode, Zap, ArrowRight, Shield } from "lucide-react";
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

type BillingCycle = "monthly" | "yearly";
type PaymentGateway = "stripe" | "mercado_pago" | "pagseguro" | "pix";

const gatewayInfo: Record<PaymentGateway, { name: string; icon: typeof CreditCard; description: string }> = {
  stripe: { name: "Cartão de Crédito", icon: CreditCard, description: "Visa, Mastercard, Amex" },
  mercado_pago: { name: "Mercado Pago", icon: Zap, description: "Cartão, boleto, Pix" },
  pagseguro: { name: "PagSeguro", icon: Shield, description: "Cartão, boleto, débito" },
  pix: { name: "PIX", icon: QrCode, description: "Pagamento instantâneo" },
};

export default function Pricing() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>("pix");
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
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

  function getPrice(plan: PricingPlan) {
    if (billingCycle === "yearly" && plan.price_yearly) {
      return plan.price_yearly / 12;
    }
    return plan.price_monthly;
  }

  function getDiscount(plan: PricingPlan) {
    if (plan.price_yearly && plan.price_monthly > 0) {
      const yearlyMonthly = plan.price_yearly / 12;
      const discount = ((plan.price_monthly - yearlyMonthly) / plan.price_monthly) * 100;
      return Math.round(discount);
    }
    return 0;
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
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          plan_id: plan.id,
          plan_slug: plan.slug,
          gateway: selectedGateway,
          billing_cycle: billingCycle,
          amount: billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly,
        },
      });

      if (error) throw error;

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data?.pix_code) {
        toast.success("Código PIX gerado! Copie e pague no seu banco.", {
          description: "O código foi copiado para sua área de transferência.",
          duration: 10000,
        });
        navigator.clipboard.writeText(data.pix_code);
      } else {
        toast.info("Processando pagamento...");
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast.error("Erro ao processar pagamento. Tente novamente.");
    } finally {
      setProcessingPlan(null);
    }
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
            Comece gratuitamente e faça upgrade quando precisar. Todos os planos incluem 
            suporte e atualizações.
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center"
        >
          <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as BillingCycle)}>
            <TabsList className="glass">
              <TabsTrigger value="monthly">Mensal</TabsTrigger>
              <TabsTrigger value="yearly" className="gap-2">
                Anual
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-500">
                  -17%
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Payment Gateway Selection */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <p className="text-center text-sm text-muted-foreground">Forma de pagamento</p>
          <div className="flex flex-wrap justify-center gap-3">
            {(Object.keys(gatewayInfo) as PaymentGateway[]).map((gateway) => {
              const info = gatewayInfo[gateway];
              const Icon = info.icon;
              return (
                <button
                  key={gateway}
                  onClick={() => setSelectedGateway(gateway)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                    selectedGateway === gateway
                      ? "border-primary bg-primary/10"
                      : "border-border/50 bg-card/50 hover:border-border"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${selectedGateway === gateway ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-left">
                    <p className="font-medium text-sm">{info.name}</p>
                    <p className="text-[10px] text-muted-foreground">{info.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
            >
              <Card className={`relative h-full flex flex-col ${
                plan.is_featured 
                  ? "border-primary/50 shadow-glow bg-gradient-to-b from-primary/5 to-transparent" 
                  : "glass"
              }`}>
                {plan.is_featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-primary text-primary-foreground shadow-glow">
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
                        {Math.round(getPrice(plan))}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    {billingCycle === "yearly" && getDiscount(plan) > 0 && (
                      <p className="text-sm text-emerald-500 mt-1">
                        Economia de {getDiscount(plan)}% no plano anual
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
                  <Button
                    className={`w-full gap-2 ${plan.is_featured ? "gradient-primary text-primary-foreground shadow-glow" : ""}`}
                    variant={plan.is_featured ? "default" : "outline"}
                    size="lg"
                    disabled={processingPlan === plan.id}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {processingPlan === plan.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Processando...
                      </>
                    ) : plan.slug === "free" ? (
                      "Começar Grátis"
                    ) : (
                      <>
                        Assinar Agora
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
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
            <span className="text-sm">Ativação instantânea</span>
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
