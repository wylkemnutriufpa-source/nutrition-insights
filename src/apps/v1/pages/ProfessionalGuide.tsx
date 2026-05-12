import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { FEATURE_REGISTRY, getFeaturesByCategory } from "@v1/lib/featureRegistry";
import { 
  Compass, CheckCircle2, Sparkles, Search, Zap, Crown, ExternalLink,
  BookOpen, UserPlus, CreditCard, ShieldCheck, ClipboardList, FileText, 
  UtensilsCrossed, Activity, ChevronDown, ChevronUp, AlertTriangle, ArrowRight
} from "lucide-react";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useCallback } from "react";
import { PROFESSIONAL_ROUTE_MAP } from "@v1/lib/featureRouteMap";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@v1/components/ui/collapsible";

const CATEGORY_META: Record<string, { gradient: string; emoji: string }> = {
  "IA & Automação": { gradient: "from-primary/20 to-primary/5", emoji: "🤖" },
  "Gestão de Pacientes": { gradient: "from-success/20 to-success/5", emoji: "👥" },
  "Comunicação": { gradient: "from-accent/20 to-accent/5", emoji: "💬" },
  "Ferramentas": { gradient: "from-info/20 to-info/5", emoji: "🔧" },
  "Relatórios & Financeiro": { gradient: "from-warning/20 to-warning/5", emoji: "📊" },
  "Inteligência Clínica": { gradient: "from-destructive/20 to-destructive/5", emoji: "🧠" },
  "Crescimento": { gradient: "from-primary/20 to-accent/5", emoji: "🚀" },
};

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  basic: { label: "Básico", color: "bg-muted text-muted-foreground" },
  premium: { label: "Premium", color: "bg-warning/10 text-warning" },
  coming_soon: { label: "Em Breve", color: "bg-info/10 text-info" },
};

const EXPLORER_LEVELS = [
  { min: 0, label: "Iniciante", icon: "🌱" },
  { min: 20, label: "Curioso", icon: "🔍" },
  { min: 40, label: "Explorador", icon: "🧭" },
  { min: 60, label: "Estrategista", icon: "♟️" },
  { min: 80, label: "Expert", icon: "⭐" },
  { min: 100, label: "Lendário", icon: "👑" },
];

function getLevel(progress: number) {
  let lvl = EXPLORER_LEVELS[0];
  for (const l of EXPLORER_LEVELS) {
    if (progress >= l.min) lvl = l;
  }
  return lvl;
}

const WORKFLOW_STEPS = [
  {
    step: 1,
    icon: UserPlus,
    title: "Cadastrar / Importar Paciente",
    status: "invited",
    description: "Adicione pacientes manualmente ou importe via planilha. Todos entram automaticamente com status 'Convidado'.",
    details: [
      "Vá em Pacientes → botão 'Novo Paciente' ou 'Importar'",
      "Preencha nome e email (obrigatórios)",
      "O sistema cria a conta automaticamente com senha temporária Fit@2026!",
      "O paciente recebe acesso mas fica bloqueado até pagamento",
    ],
    tip: "O email deve ser único. Se já existe, o sistema vincula o paciente existente.",
    route: "/patients",
  },
  {
    step: 2,
    icon: CreditCard,
    title: "Confirmar Pagamento",
    status: "awaiting_payment → onboarding_active",
    description: "Confirme o pagamento do paciente para liberar o onboarding. O paciente entra direto no onboarding após confirmação.",
    details: [
      "No painel de controle rápido, clique no ícone 💳 do paciente",
      "Ou acesse o perfil do paciente e clique em 'Confirmar Pagamento'",
      "Após confirmação, o paciente já entra no onboarding",
      "O consentimento LGPD é a primeira etapa do onboarding",
      "O paciente recebe notificação automática",
    ],
    tip: "Você pode confirmar pagamentos em lote pelo controle rápido de pacientes.",
    route: "/patients",
  },
  {
    step: 4,
    icon: ClipboardList,
    title: "Onboarding (Anamnese)",
    status: "onboarding_active → onboarding_completed",
    description: "O paciente preenche a anamnese completa com dados clínicos, hábitos e objetivos.",
    details: [
      "O paciente responde o questionário de onboarding",
      "Dados incluem: histórico clínico, hábitos alimentares, objetivos",
      "Ao finalizar, status muda para 'Onboarding Concluído'",
      "Você pode liberar onboarding manualmente pelo controle rápido (ícone 🚀)",
    ],
    tip: "Se o paciente travar, você pode liberar o onboarding manualmente.",
    route: "/patients",
  },
  {
    step: 5,
    icon: FileText,
    title: "Revisão do Profissional",
    status: "draft_ready_for_review",
    description: "Revise os dados da anamnese e prepare o plano alimentar personalizado.",
    details: [
      "Acesse o perfil do paciente para ver dados do onboarding",
      "Use a IA para gerar insights da anamnese",
      "Monte o protocolo nutricional baseado nos dados coletados",
      "Crie o plano alimentar personalizado",
    ],
    tip: "Use os protocolos pré-criados para agilizar a montagem do plano.",
    route: "/protocols",
  },
  {
    step: 6,
    icon: UtensilsCrossed,
    title: "Publicar Plano Alimentar",
    status: "plan_published",
    description: "Publique o plano alimentar para o paciente ter acesso à sua dieta.",
    details: [
      "Vá em Planos Alimentares → selecione o paciente",
      "Monte as refeições e macros conforme protocolo",
      "Clique em 'Publicar' para liberar acesso ao paciente",
      "O paciente recebe notificação push automática",
    ],
    tip: "Você pode duplicar planos existentes para agilizar.",
    route: "/meal-plans",
  },
  {
    step: 7,
    icon: Activity,
    title: "Acompanhamento Ativo",
    status: "active_followup",
    description: "Paciente está ativo! Acompanhe evolução, check-ins, adesão e faça ajustes.",
    details: [
      "Monitore o dashboard clínico para ver alertas",
      "Acompanhe adesão ao plano alimentar",
      "Use check-ins periódicos para coletar dados",
      "Ajuste protocolos conforme evolução clínica",
    ],
    tip: "O motor de inteligência clínica gera alertas automáticos de pacientes em risco.",
    route: "/clinical-brain",
  },
];

const COMMON_ISSUES = [
  {
    question: "Paciente não consegue fazer login?",
    answer: "A senha padrão é Fit@2026! (exatamente assim, com F maiúsculo e ! no final). Verifique se o email está correto e sem espaços. Se persistir, redefina a senha pelo perfil do paciente.",
  },
  {
    question: "Paciente está bloqueado mesmo após pagamento?",
    answer: "Confirme o pagamento pelo controle rápido (ícone 💳). Verifique se o status mudou para 'Aguardando Consentimento'. Se ainda bloqueado, acesse o perfil e clique em 'Confirmar Pagamento'.",
  },
  {
    question: "Paciente completou onboarding mas aparece como incompleto?",
    answer: "Acesse o perfil do paciente e use o botão 'Liberar Onboarding' para forçar a transição de status manualmente.",
  },
  {
    question: "Como desativar um paciente?",
    answer: "No controle rápido de pacientes, clique no X para desativar. O paciente sai da lista de ativos e vai para a lista de inativos. Pode reativar a qualquer momento.",
  },
  {
    question: "Notificações push não chegam?",
    answer: "O paciente precisa ter autorizado notificações no navegador. Peça para ele acessar o sistema e permitir notificações quando solicitado.",
  },
];

export default function ProfessionalGuide() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exploredKeys, setExploredKeys] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"manual" | "features">("manual");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const totalFeatures = FEATURE_REGISTRY.length;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("professional_feature_usage")
      .select("feature_name")
      .eq("nutritionist_id", user.id)
      .then(({ data }) => {
        if (data) {
          setExploredKeys(data.map((d) => d.feature_name));
        }
        setLoading(false);
      });
  }, [user]);

  const handleNavigate = useCallback(async (featureName: string) => {
    if (!user) return;
    if (!exploredKeys.includes(featureName)) {
      supabase
        .from("professional_feature_usage")
        .upsert({ nutritionist_id: user.id, feature_name: featureName, status: "explored" }, { onConflict: "nutritionist_id,feature_name" })
        .then(({ error }) => {
          if (!error) {
            setExploredKeys((prev) => [...prev, featureName]);
          }
        });
    }
    const route = PROFESSIONAL_ROUTE_MAP[featureName];
    if (route) {
      navigate(route);
    } else {
      toast.info("Funcionalidade em desenvolvimento");
    }
  }, [user, exploredKeys, navigate]);

  const categories = getFeaturesByCategory();
  const categoryNames = Object.keys(categories);

  const filteredCategories = Object.entries(categories)
    .filter(([cat]) => !activeCategory || cat === activeCategory)
    .map(([cat, features]) => ({
      cat,
      features: features.filter(
        (f) =>
          !search ||
          f.label.toLowerCase().includes(search.toLowerCase()) ||
          f.description.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(({ features }) => features.length > 0);

  const exploredCount = exploredKeys.length;
  const progress = totalFeatures > 0 ? Math.round((exploredCount / totalFeatures) * 100) : 0;
  const lvl = getLevel(progress);

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
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-warning/10 border border-primary/20 p-6 md:p-8"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-warning/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                <Compass className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold">
                  Guia do Profissional
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manual completo + {totalFeatures} ferramentas da plataforma
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-4 p-4 rounded-xl bg-background/60 backdrop-blur-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{lvl.icon}</span>
                  <span className="text-sm font-semibold">{lvl.label}</span>
                  <Badge variant="secondary" className="text-xs">{progress}%</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">{exploredCount}/{totalFeatures}</span>
                </div>
              </div>
              <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-warning shadow-[0_0_12px_rgba(var(--primary),0.4)]"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab switcher */}
        <div className="flex gap-2 bg-muted/50 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "manual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Manual Operacional
          </button>
          <button
            onClick={() => setActiveTab("features")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "features"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Compass className="w-4 h-4" />
            Explorar Funcionalidades
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "manual" ? (
            <motion.div
              key="manual"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Lifecycle Steps */}
              <div>
                <h2 className="text-lg font-display font-bold mb-1 flex items-center gap-2">
                  📋 Fluxo Completo do Paciente
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Siga estas 7 etapas na ordem para garantir que tudo funcione perfeitamente.
                </p>

                <div className="space-y-3">
                  {WORKFLOW_STEPS.map((ws, i) => {
                    const Icon = ws.icon;
                    return (
                      <Collapsible key={ws.step}>
                        <Card className="overflow-hidden border-border hover:border-primary/30 transition-colors">
                          <CollapsibleTrigger className="w-full text-left">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center flex-shrink-0">
                                  <Icon className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] px-1.5 flex-shrink-0">
                                      Etapa {ws.step}
                                    </Badge>
                                    <p className="text-sm font-semibold truncate">{ws.title}</p>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ws.description}</p>
                                </div>
                                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                              </div>
                            </CardContent>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px]">Status: {ws.status}</Badge>
                              </div>
                              <ul className="space-y-1.5">
                                {ws.details.map((d, j) => (
                                  <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                                    {d}
                                  </li>
                                ))}
                              </ul>
                              {ws.tip && (
                                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/5 border border-warning/20">
                                  <Sparkles className="w-3.5 h-3.5 text-warning mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-warning-foreground"><span className="font-semibold">Dica:</span> {ws.tip}</p>
                                </div>
                              )}
                              {ws.route && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-8 gap-1.5"
                                  onClick={() => navigate(ws.route!)}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Ir para esta etapa
                                </Button>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>

              {/* FAQ */}
              <div>
                <h2 className="text-lg font-display font-bold mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Problemas Comuns e Soluções
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Respostas rápidas para os problemas mais frequentes.
                </p>

                <div className="space-y-2">
                  {COMMON_ISSUES.map((faq, i) => (
                    <Card key={i} className="overflow-hidden">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full text-left p-4 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                        </div>
                        <p className="text-sm font-medium flex-1">{faq.question}</p>
                        {openFaq === i ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      <AnimatePresence>
                        {openFaq === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 border-t border-border pt-3">
                              <p className="text-sm text-muted-foreground">{faq.answer}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="features"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Search & filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar funcionalidade..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      !activeCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    Todas
                  </button>
                  {categoryNames.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                        activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {CATEGORY_META[cat]?.emoji} {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Features */}
              <AnimatePresence mode="popLayout">
                {filteredCategories.map(({ cat, features }, catIdx) => (
                  <motion.div
                    key={cat}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: catIdx * 0.05 }}
                  >
                    <h2 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
                      <span>{CATEGORY_META[cat]?.emoji}</span>
                      {cat}
                      <Badge variant="secondary" className="text-xs">
                        {features.filter((f) => exploredKeys.includes(f.name)).length}/{features.length}
                      </Badge>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                      {features.map((feature, idx) => {
                        const isExplored = exploredKeys.includes(feature.name);
                        const Icon = feature.icon;
                        const tier = TIER_LABELS[feature.defaultTier || "basic"];
                        const hasRoute = !!PROFESSIONAL_ROUTE_MAP[feature.name];
                        return (
                          <motion.div
                            key={feature.name}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.03 }}
                          >
                            <Card
                              className={`group relative overflow-hidden transition-all hover:shadow-md cursor-pointer ${
                                isExplored ? "border-primary/30 bg-primary/5" : "hover:border-primary/20"
                              }`}
                              onClick={() => handleNavigate(feature.name)}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                              <CardContent className="p-4 relative z-10">
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                      isExplored ? "bg-gradient-to-br from-primary/20 to-accent/20" : "bg-muted"
                                    }`}
                                  >
                                    <Icon className={`w-5 h-5 ${isExplored ? "text-primary" : "text-muted-foreground"}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-semibold truncate">{feature.label}</p>
                                      {isExplored && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{feature.description}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tier.color}`}>
                                        {tier.label}
                                      </span>
                                      {feature.addedVersion && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                          v{feature.addedVersion}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant={isExplored ? "outline" : "default"}
                                  className="w-full mt-3 text-xs h-8 gap-1.5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNavigate(feature.name);
                                  }}
                                >
                                  {hasRoute ? (
                                    <>
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      Ir para {feature.label}
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-3.5 h-3.5" />
                                      Em breve
                                    </>
                                  )}
                                </Button>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filteredCategories.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma funcionalidade encontrada.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
