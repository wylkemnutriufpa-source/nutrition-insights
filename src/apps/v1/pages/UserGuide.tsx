import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { useFeatureExplorer } from "@v1/hooks/useFeatureExplorer";
import { PATIENT_FEATURE_REGISTRY, getPatientFeaturesByCategory } from "@v1/lib/patientFeatureRegistry";
import { Compass, CheckCircle2, Search, Trophy, Zap, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PATIENT_ROUTE_MAP } from "@v1/lib/featureRouteMap";

const CATEGORY_META: Record<string, { gradient: string; emoji: string }> = {
  "Alimentação": { gradient: "from-success/20 to-success/5", emoji: "🥗" },
  "IA & Análises": { gradient: "from-primary/20 to-primary/5", emoji: "🤖" },
  "Engajamento": { gradient: "from-warning/20 to-warning/5", emoji: "🏆" },
  "Comunicação": { gradient: "from-accent/20 to-accent/5", emoji: "💬" },
  "Saúde & Ferramentas": { gradient: "from-info/20 to-info/5", emoji: "❤️" },
};

export default function UserGuide() {
  const { exploredKeys, progress, level, exploredCount, totalFeatures, markExplored, loading } = useFeatureExplorer();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = getPatientFeaturesByCategory();
  const categoryNames = Object.keys(categories);

  const handleNavigate = async (key: string, label: string) => {
    // Mark as explored in background
    if (!exploredKeys.includes(key)) {
      markExplored(key);
    }
    // Navigate to the feature's real route
    const route = PATIENT_ROUTE_MAP[key];
    if (route) {
      navigate(route);
    } else {
      toast.info("Funcionalidade em desenvolvimento");
    }
  };

  const filteredCategories = Object.entries(categories)
    .filter(([cat]) => !activeCategory || cat === activeCategory)
    .map(([cat, features]) => ({
      cat,
      features: features.filter(f =>
        !search || f.label.toLowerCase().includes(search.toLowerCase()) ||
        f.description.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(({ features }) => features.length > 0);

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
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                <Compass className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold">
                  Guia do Usuário
                </h1>
                <p className="text-sm text-muted-foreground">
                  Descubra tudo que o sistema pode fazer por você
                </p>
              </div>
            </div>

            {/* Progress section */}
            <div className="mt-4 p-4 rounded-xl bg-background/60 backdrop-blur-sm border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium">Nível: {level}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{exploredCount}/{totalFeatures}</span>
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
              <p className="text-xs text-muted-foreground mt-1.5 text-right">{progress}% explorado</p>
            </div>

            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Clique em qualquer funcionalidade para navegar diretamente até ela!
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

        {/* Feature Grid */}
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
                  {features.filter(f => exploredKeys.includes(f.key)).length}/{features.length}
                </Badge>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {features.map((feature, idx) => {
                  const isExplored = exploredKeys.includes(feature.key);
                  const Icon = feature.icon;
                  const hasRoute = !!PATIENT_ROUTE_MAP[feature.key];
                  return (
                    <motion.div
                      key={feature.key}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <Card
                        className={`group relative overflow-hidden transition-all hover:shadow-md cursor-pointer ${
                          isExplored ? "border-primary/30 bg-primary/5" : "hover:border-primary/20"
                        }`}
                        onClick={() => handleNavigate(feature.key, feature.label)}
                      >
                        {/* Shimmer on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                        
                        <CardContent className="p-4 relative z-10">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              isExplored
                                ? "bg-gradient-to-br from-primary/20 to-accent/20"
                                : "bg-muted"
                            }`}>
                              <Icon className={`w-5 h-5 ${isExplored ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold truncate">{feature.label}</p>
                                {isExplored && (
                                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            variant={isExplored ? "outline" : "default"}
                            className="w-full mt-3 text-xs h-8 gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigate(feature.key, feature.label);
                            }}
                          >
                            {hasRoute ? (
                              <>
                                <ExternalLink className="w-3.5 h-3.5" />
                                Ir para {feature.label}
                              </>
                            ) : (
                              "Em breve"
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
