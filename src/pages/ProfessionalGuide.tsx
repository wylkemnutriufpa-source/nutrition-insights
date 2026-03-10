import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FEATURE_REGISTRY, getFeaturesByCategory } from "@/lib/featureRegistry";
import { Compass, CheckCircle2, Sparkles, Search, Trophy, Zap, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useCallback } from "react";

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

export default function ProfessionalGuide() {
  const { user } = useAuth();
  const [exploredKeys, setExploredKeys] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const markExplored = useCallback(async (featureName: string) => {
    if (!user || exploredKeys.includes(featureName)) return;
    const { error } = await supabase
      .from("professional_feature_usage")
      .upsert({ nutritionist_id: user.id, feature_name: featureName, status: "explored" }, { onConflict: "nutritionist_id,feature_name" });
    if (!error) {
      setExploredKeys((prev) => [...prev, featureName]);
      toast.success(`"${featureName}" marcada como explorada! ✓`, { duration: 2000 });
    }
  }, [user, exploredKeys]);

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
                  Domine todas as {totalFeatures} ferramentas da plataforma
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

            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Crown className="w-3 h-3 text-warning" />
              Explore funcionalidades para subir de nível e dominar a plataforma!
            </p>
          </div>
        </motion.div>

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
                  return (
                    <motion.div
                      key={feature.name}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <Card
                        className={`group relative overflow-hidden transition-all hover:shadow-md ${
                          isExplored ? "border-primary/30 bg-primary/5" : "hover:border-primary/20"
                        }`}
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
                            variant={isExplored ? "ghost" : "default"}
                            className="w-full mt-3 text-xs h-8"
                            onClick={() => markExplored(feature.name)}
                          >
                            {isExplored ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Explorada ✓
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 mr-1" />
                                Marcar como explorada
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
      </div>
    </DashboardLayout>
  );
}
