import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  User, Loader2, Copy, CheckCircle2, QrCode, ArrowLeft,
  Smartphone, Crown, Star, Sparkles, Award, Briefcase
} from "lucide-react";

interface PixConfig {
  id: string;
  plan_label: string;
  plan_type: string;
  amount: number;
  pix_code: string;
  qr_code_url: string | null;
}

interface ProfileData {
  full_name: string;
  avatar_url: string | null;
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  "Basic": Star,
  "Profissional": Briefcase,
  "Premium": Crown,
  "Prestige Basic": Star,
  "Prestige Elite": Crown,
  "Prestige Pro": Sparkles,
  "Prestige Premium": Crown,
  "Especial": Sparkles,
};

const PLAN_DESCRIPTIONS: Record<string, string> = {
  "Basic": "Ideal para quem está começando. Acesso às funcionalidades essenciais da plataforma.",
  "Profissional": "Para profissionais que buscam ferramentas avançadas de gestão e acompanhamento.",
  "Premium": "Acesso completo com IA, automações e suporte prioritário.",
  "Prestige Basic": "Acompanhamento nutricional personalizado com plano alimentar básico.",
  "Prestige Elite": "Plano completo com acompanhamento premium e consultas frequentes.",
  "Prestige Pro": "Acompanhamento avançado com análises detalhadas e suporte dedicado.",
  "Prestige Premium": "Experiência máxima: plano anual com todos os benefícios inclusos.",
  "Especial": "Plano especial com benefícios exclusivos e atendimento VIP.",
};

export default function PublicPlans({ planType }: { planType: "patient_prestige" | "professional" }) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [pixConfigs, setPixConfigs] = useState<PixConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PixConfig | null>(null);
  const [copied, setCopied] = useState(false);
  const [profName, setProfName] = useState("Profissional");

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: pub } = await supabase
        .from("public_profile_settings")
        .select("nutritionist_id, slug")
        .eq("slug", slug)
        .eq("is_public", true)
        .maybeSingle();

      if (!pub) { setNotFound(true); setLoading(false); return; }

      const [profileRes, pixRes] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("user_id", pub.nutritionist_id).maybeSingle(),
        supabase.from("pix_payment_configs").select("*").eq("is_active", true).eq("nutritionist_id", pub.nutritionist_id).eq("plan_type", planType).order("amount", { ascending: true }),
      ]);

      setProfileData(profileRes.data as ProfileData | null);
      setProfName((profileRes.data as ProfileData | null)?.full_name || "Profissional");
      setPixConfigs((pixRes.data || []) as PixConfig[]);
      setLoading(false);
    })();
  }, [slug, planType]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 3000);
  };

  const fmt = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const isPatient = planType === "patient_prestige";
  const title = isPatient ? "Planos para Pacientes" : "Planos para Profissionais";
  const subtitle = isPatient
    ? `Escolha seu plano de acompanhamento com ${profName}`
    : "Escolha o plano ideal para sua prática profissional";

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Perfil não encontrado</h1>
        <p className="text-muted-foreground">Este profissional não possui um perfil público.</p>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{title} — {profName} | FitJourney</title>
        <meta name="description" content={subtitle} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/20 via-background to-accent/10 py-12 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center"
          >
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 gap-2"
              onClick={() => navigate(`/p/${slug}`)}
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao perfil
            </Button>

            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 border-2 border-primary/30">
              {profileData?.avatar_url ? (
                <img src={profileData.avatar_url} alt={profName} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-primary" />
              )}
            </div>

            <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">{title}</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">{subtitle}</p>
          </motion.div>
        </div>

        {/* Plans Grid */}
        <div className="max-w-4xl mx-auto px-4 py-10">
          {pixConfigs.length === 0 ? (
            <div className="text-center py-16">
              <Smartphone className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum plano disponível no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {pixConfigs.map((cfg, i) => {
                const Icon = PLAN_ICONS[cfg.plan_label] || Star;
                const desc = PLAN_DESCRIPTIONS[cfg.plan_label] || "Plano de acompanhamento personalizado.";
                const isSelected = selectedPlan?.id === cfg.id;
                const isMiddle = pixConfigs.length === 3 && i === 1;

                return (
                  <motion.div
                    key={cfg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card
                      className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg ${
                        isSelected
                          ? "border-primary shadow-lg ring-2 ring-primary/20"
                          : "border-border/50 hover:border-primary/40"
                      } ${isMiddle ? "sm:scale-105 sm:shadow-md" : ""}`}
                      onClick={() => { setSelectedPlan(cfg); setCopied(false); }}
                    >
                      {isMiddle && (
                        <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
                      )}
                      {isSelected && (
                        <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-primary" />
                      )}

                      <CardContent className="pt-6 pb-5 text-center space-y-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto ${
                          isMiddle ? "bg-primary/15" : "bg-muted/60"
                        }`}>
                          <Icon className={`w-6 h-6 ${isMiddle ? "text-primary" : "text-muted-foreground"}`} />
                        </div>

                        <div>
                          <h3 className="font-display font-bold text-lg">{cfg.plan_label}</h3>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed px-2">{desc}</p>
                        </div>

                        <div className="pt-1">
                          <span className="text-2xl font-bold text-primary">{fmt(cfg.amount)}</span>
                          <span className="text-xs text-muted-foreground block mt-0.5">
                            {cfg.amount >= 500 ? "/anual" : "/mensal"}
                          </span>
                        </div>

                        <Button
                          variant={isSelected ? "default" : "outline"}
                          className={`w-full gap-2 ${isSelected ? "gradient-primary" : ""}`}
                          size="sm"
                        >
                          <Smartphone className="w-4 h-4" />
                          {isSelected ? "Selecionado" : "Selecionar"}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Payment Section */}
          {selectedPlan && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 max-w-lg mx-auto"
            >
              <Card className="border-primary/30 shadow-lg overflow-hidden">
                <div className="h-1 gradient-primary" />
                <CardContent className="pt-6 space-y-4">
                  <div className="text-center">
                    <h3 className="font-display font-bold text-lg">
                      Pagamento via PIX
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedPlan.plan_label} — {fmt(selectedPlan.amount)}
                    </p>
                  </div>

                  {/* QR Code */}
                  {selectedPlan.qr_code_url ? (
                    <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-background border border-border/50">
                      <p className="text-xs font-medium text-muted-foreground">
                        Escaneie o QR Code com seu app bancário
                      </p>
                      <div className="w-52 h-52 rounded-lg overflow-hidden bg-white p-2 shadow-sm">
                        <img
                          src={selectedPlan.qr_code_url}
                          alt={`QR Code PIX - ${selectedPlan.plan_label}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 border border-dashed border-border/50">
                      <QrCode className="w-10 h-10 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">QR Code indisponível — use o código abaixo</p>
                    </div>
                  )}

                  {/* Copy code */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Copie o código PIX Copia e Cola:</p>
                    <div className="relative">
                      <div className="p-3 pr-20 rounded-lg bg-muted/40 border border-border/50 text-[10px] font-mono break-all leading-relaxed max-h-20 overflow-y-auto">
                        {selectedPlan.pix_code}
                      </div>
                      <Button
                        size="sm"
                        variant={copied ? "default" : "outline"}
                        className="absolute top-2 right-2 h-7 gap-1.5 text-[10px]"
                        onClick={() => copyCode(selectedPlan.pix_code)}
                      >
                        {copied ? (
                          <><CheckCircle2 className="w-3 h-3" /> Copiado</>
                        ) : (
                          <><Copy className="w-3 h-3" /> Copiar</>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="text-center space-y-2 pt-2">
                    <p className="text-[11px] text-muted-foreground">
                      Após o pagamento, envie o comprovante para <strong>{profName}</strong> para ativar seu acesso.
                    </p>
                    {isPatient && (
                      <Button
                        className="w-full gradient-primary gap-2"
                        onClick={() => navigate(`/cadastro?ref=${slug}&plan=${selectedPlan.plan_label}`)}
                      >
                        <Award className="w-4 h-4" />
                        Já paguei — Criar minha conta
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
