import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePrestige } from "@/hooks/usePrestige";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Trophy, TrendingUp, Flame, Utensils, Dumbbell, ClipboardCheck, CheckCircle2, Sparkles, Lock, Rocket, Bot, Palette, BarChart3, Users, Zap } from "lucide-react";
import PrestigeBadge from "@/components/prestige/PrestigeBadge";

type Period = "daily" | "weekly" | "monthly" | "annual";

interface RankEntry {
  patient_id: string;
  total_points: number;
  display_name: string;
  avatar_url: string | null;
  plan_slug: string | null;
  plan_color: string | null;
  crown_enabled: boolean | null;
  badge_icon: string | null;
  rank_position: number;
  points_checklist: number;
  points_meals: number;
  points_training: number;
  points_checkin: number;
  points_other: number;
}

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Hoje",
  weekly: "Semana",
  monthly: "Mês",
  annual: "Ano",
};

const PLAN_LABELS: Record<string, string> = {
  basic: "Basic",
  elite: "Elite",
  pro: "Pro",
  premium: "Premium",
};

function MedalIcon({ position, size = 40 }: { position: number; size?: number }) {
  const colors = [
    { outer: "#FFD700", inner: "#FFC107", text: "#8B6914", ribbon: "#E53935", glow: "rgba(255,215,0,0.4)" },
    { outer: "#C0C0C0", inner: "#B0BEC5", text: "#546E7A", ribbon: "#E53935", glow: "rgba(192,192,192,0.4)" },
    { outer: "#CD7F32", inner: "#D4905C", text: "#6D4C2F", ribbon: "#E53935", glow: "rgba(205,127,50,0.4)" },
  ];
  const c = colors[position] || colors[2];
  const r = size / 2;

  return (
    <svg width={size} height={size + 12} viewBox={`0 0 ${size} ${size + 12}`}>
      {/* Ribbons */}
      <polygon points={`${r - 6},${size - 4} ${r - 12},${size + 10} ${r - 2},${size + 4}`} fill={c.ribbon} />
      <polygon points={`${r + 6},${size - 4} ${r + 12},${size + 10} ${r + 2},${size + 4}`} fill={c.ribbon} />
      {/* Glow */}
      <circle cx={r} cy={r} r={r} fill={c.glow} />
      {/* Medal body */}
      <circle cx={r} cy={r} r={r - 2} fill={c.outer} stroke={c.inner} strokeWidth="2" />
      <circle cx={r} cy={r} r={r - 6} fill="none" stroke={c.inner} strokeWidth="1" opacity="0.5" />
      {/* Laurel hints */}
      <path d={`M${r - 8},${r + 6} Q${r - 12},${r} ${r - 8},${r - 6}`} fill="none" stroke={c.inner} strokeWidth="1.5" opacity="0.6" />
      <path d={`M${r + 8},${r + 6} Q${r + 12},${r} ${r + 8},${r - 6}`} fill="none" stroke={c.inner} strokeWidth="1.5" opacity="0.6" />
      {/* Number */}
      <text x={r} y={r + 5} textAnchor="middle" fontSize={size * 0.38} fontWeight="bold" fill={c.text}>
        {position + 1}
      </text>
    </svg>
  );
}

function CategoryBar({ label, icon: Icon, points, maxPoints, color }: {
  label: string;
  icon: React.ElementType;
  points: number;
  maxPoints: number;
  color: string;
}) {
  const pct = maxPoints > 0 ? Math.min((points / maxPoints) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
      <span className="w-16 truncate text-muted-foreground">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="w-8 text-right font-medium">{points}</span>
    </div>
  );
}

export default function GlobalRanking() {
  const { user, isNutritionist, isAdmin, isPatient } = useAuth();
  const navigate = useNavigate();
  const { plans: allPrestigePlans } = usePrestige();
  const [period, setPeriod] = useState<Period>("monthly");
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hasPremium, setHasPremium] = useState<boolean | null>(null);
  const [nutritionistId, setNutritionistId] = useState<string | null>(null);

  // Check premium access for nutritionists; patients always have access
  useEffect(() => {
    if (!user) return;
    if (isAdmin) {
      setHasPremium(true);
      return;
    }
    if (isPatient) {
      // All patients can see their nutritionist's ranking
      setHasPremium(true);
      supabase
        .from("nutritionist_patients")
        .select("nutritionist_id")
        .eq("patient_id", user.id)
        .eq("status", "active")
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data) {
            setNutritionistId(data.nutritionist_id);
          }
        });
      return;
    }
    if (isNutritionist) {
      setNutritionistId(user.id);
      checkNutritionistPremium(user.id);
    }
  }, [user, isAdmin, isPatient, isNutritionist]);

  async function checkNutritionistPremium(nutId: string) {
    // Check professional_feature_usage for ranking_global
    const { data: featureRow } = await supabase
      .from("professional_feature_usage" as any)
      .select("status")
      .eq("nutritionist_id", nutId)
      .eq("feature_name", "ranking_global")
      .maybeSingle();

    if (featureRow && (featureRow as any).status === "enabled") {
      setHasPremium(true);
      return;
    }

    // Check if their pricing plan is premium-tier
    const { data: profile } = await supabase
      .from("professional_profiles")
      .select("plan_id, pricing_plans:plan_id(slug)")
      .eq("user_id", nutId)
      .maybeSingle();

    const planSlug = (profile as any)?.pricing_plans?.slug;
    const isPremiumPlan = planSlug === "premium" || planSlug === "enterprise" || planSlug === "pro";
    setHasPremium(isPremiumPlan);
  }

  const loadRanking = useCallback(async (p: Period) => {
    setLoading(true);
    const params: any = { _period: p, _limit: 20 };
    // Scope to nutritionist's patients (admins see all)
    if (nutritionistId && !isAdmin) {
      params._nutritionist_id = nutritionistId;
    }
    const { data, error } = await supabase.rpc("get_ranking_by_period", params);
    if (!error && data) {
      setRanking(data as RankEntry[]);
    }
    setLoading(false);
  }, [nutritionistId, isAdmin]);

  useEffect(() => {
    if (hasPremium) {
      loadRanking(period);
      const interval = setInterval(() => loadRanking(period), 30 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [period, loadRanking, hasPremium]);

  const myRank = ranking.find((r) => r.patient_id === user?.id);
  const podium = ranking.slice(0, 3);
  const rest = ranking.slice(3, 20);

  const maxCategoryPoints = Math.max(
    ...ranking.map(r => Math.max(r.points_checklist, r.points_meals, r.points_training, r.points_checkin, r.points_other)),
    1
  );

  // Premium gate - show upgrade prompt
  if (hasPremium === false) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto py-20 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-warning" />
          </div>
          <h1 className="font-display text-2xl font-bold">Ranking Global — Premium</h1>
          <p className="text-muted-foreground">
            O Ranking Global é uma funcionalidade exclusiva do plano <strong>Premium</strong>. 
            Engaje seus pacientes com competição saudável e gamificação avançada.
          </p>
          <Card className="text-left border-warning/30 bg-warning/5">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Crown className="w-5 h-5 text-warning" /> O que o Premium inclui:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2"><Trophy className="w-4 h-4 text-warning" /> Ranking Global de Pacientes</div>
                <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Todas as features de IA</div>
                <div className="flex items-center gap-2"><Rocket className="w-4 h-4 text-primary" /> Programas Personalizados</div>
                <div className="flex items-center gap-2"><Bot className="w-4 h-4 text-primary" /> Automações Inteligentes</div>
                <div className="flex items-center gap-2"><Palette className="w-4 h-4 text-primary" /> Branding Personalizado</div>
                <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Inteligência Clínica</div>
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Perfil Público & Leads</div>
                <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Limites de IA expandidos</div>
              </div>
            </CardContent>
          </Card>
          {isNutritionist && (
            <Button onClick={() => navigate("/pricing")} className="gap-2">
              <Crown className="w-4 h-4" /> Ver Planos Premium
            </Button>
          )}
          {isPatient && (
            <p className="text-xs text-muted-foreground">
              Peça ao seu nutricionista para ativar o plano Premium para acessar o ranking.
            </p>
          )}
        </div>
      </DashboardLayout>
    );
  }

  if (hasPremium === null) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-7 h-7 text-yellow-400" /> Ranking Global
            </h1>
            <p className="text-muted-foreground text-sm">
              Competição saudável de engajamento — Top 20
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            Atualiza a cada 30min
          </div>
        </div>

        {/* Period Tabs */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="w-full grid grid-cols-4">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <TabsTrigger key={p} value={p} className="text-sm">
                {PERIOD_LABELS[p]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* My Position */}
        {myRank && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                  #{myRank.rank_position}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Sua posição — {PERIOD_LABELS[period]}</p>
                  <p className="font-display font-bold text-lg">{myRank.total_points} pontos</p>
                </div>
                {myRank.plan_slug && (
                  <PrestigeBadge
                    plan={allPrestigePlans.find(p => p.slug === myRank.plan_slug) || null}
                    allPlans={allPrestigePlans}
                    size="sm"
                    clickable
                  />
                )}
                <TrendingUp className="w-5 h-5 text-primary" />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Podium */}
        {!loading && podium.length > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-6 pb-2">
            {[1, 0, 2].map((idx) => {
              const entry = podium[idx];
              if (!entry) return <div key={idx} />;
              const isFirst = idx === 0;
              const medalSize = isFirst ? 52 : 40;
              return (
                <motion.div
                  key={entry.patient_id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.15, type: "spring", stiffness: 200 }}
                  className={`flex flex-col items-center cursor-pointer ${
                    isFirst ? "order-1 -mt-6" : idx === 1 ? "order-0 mt-2" : "order-2 mt-4"
                  }`}
                  onClick={() => setExpandedId(expandedId === entry.patient_id ? null : entry.patient_id)}
                >
                  <div className="relative">
                    <Avatar
                      className={`${isFirst ? "w-20 h-20" : "w-14 h-14"} border-2 shadow-lg`}
                      style={{ borderColor: entry.plan_color || "#6b7280" }}
                    >
                      <AvatarImage src={entry.avatar_url || undefined} />
                      <AvatarFallback className={`${isFirst ? "text-xl" : "text-base"} font-bold`}>
                        {entry.display_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {entry.crown_enabled && (
                      <Crown
                        className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 drop-shadow"
                        style={{ color: entry.plan_color || "#f59e0b" }}
                      />
                    )}
                  </div>

                  <div className="mt-1">
                    <MedalIcon position={idx} size={medalSize} />
                  </div>

                  <p
                    className="text-sm font-bold mt-0.5 text-center truncate max-w-[110px]"
                    style={{ color: entry.plan_color || undefined }}
                  >
                    {entry.display_name}
                  </p>

                  {entry.plan_slug && (
                    <PrestigeBadge
                      plan={allPrestigePlans.find(p => p.slug === entry.plan_slug) || null}
                      allPlans={allPrestigePlans}
                      size="sm"
                      clickable
                    />
                  )}

                  <span className="text-sm font-bold mt-1">
                    {entry.total_points} <span className="text-xs text-muted-foreground">pts</span>
                  </span>

                  {/* Expanded category breakdown */}
                  <AnimatePresence>
                    {expandedId === entry.patient_id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="w-full mt-2 space-y-1 overflow-hidden"
                      >
                        <CategoryBar label="Checklist" icon={ClipboardCheck} points={entry.points_checklist} maxPoints={maxCategoryPoints} color="#22c55e" />
                        <CategoryBar label="Refeições" icon={Utensils} points={entry.points_meals} maxPoints={maxCategoryPoints} color="#3b82f6" />
                        <CategoryBar label="Treino" icon={Dumbbell} points={entry.points_training} maxPoints={maxCategoryPoints} color="#f59e0b" />
                        <CategoryBar label="Check-in" icon={CheckCircle2} points={entry.points_checkin} maxPoints={maxCategoryPoints} color="#8b5cf6" />
                        <CategoryBar label="Outros" icon={Sparkles} points={entry.points_other} maxPoints={maxCategoryPoints} color="#ec4899" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Rest of ranking (4th - 20th) */}
        {!loading && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" /> Classificação — {PERIOD_LABELS[period]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {ranking.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum participante com pontos neste período.
                </p>
              ) : rest.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Apenas o pódio tem pontos neste período.
                </p>
              ) : (
                <AnimatePresence>
                  {rest.map((entry, i) => {
                    const isMe = entry.patient_id === user?.id;
                    const isExpanded = expandedId === entry.patient_id;
                    return (
                      <motion.div
                        key={entry.patient_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className={`rounded-xl transition-colors cursor-pointer ${
                          isMe ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
                        }`}
                        onClick={() => setExpandedId(isExpanded ? null : entry.patient_id)}
                      >
                        <div className="flex items-center gap-3 p-3">
                          <span className="w-8 text-center text-sm font-bold text-muted-foreground">
                            {entry.rank_position}
                          </span>
                          <div className="relative">
                            <Avatar
                              className="w-9 h-9"
                              style={entry.plan_color ? { borderColor: entry.plan_color, borderWidth: 2 } : undefined}
                            >
                              <AvatarImage src={entry.avatar_url || undefined} />
                              <AvatarFallback>{entry.display_name?.[0] || "?"}</AvatarFallback>
                            </Avatar>
                            {entry.crown_enabled && (
                              <Crown className="absolute -top-1 -right-1 w-3.5 h-3.5" style={{ color: entry.plan_color || "#f59e0b" }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={entry.plan_color ? { color: entry.plan_color } : undefined}>
                              {entry.display_name}
                            </p>
                            {entry.plan_slug && (
                              <PrestigeBadge
                                plan={allPrestigePlans.find(p => p.slug === entry.plan_slug) || null}
                                allPlans={allPrestigePlans}
                                size="sm"
                                clickable
                              />
                            )}
                          </div>
                          <span className="text-sm font-bold">
                            {entry.total_points} <span className="text-xs text-muted-foreground">pts</span>
                          </span>
                        </div>

                        {/* Expanded breakdown */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-3 pb-3 space-y-1 overflow-hidden"
                            >
                              <CategoryBar label="Checklist" icon={ClipboardCheck} points={entry.points_checklist} maxPoints={maxCategoryPoints} color="#22c55e" />
                              <CategoryBar label="Refeições" icon={Utensils} points={entry.points_meals} maxPoints={maxCategoryPoints} color="#3b82f6" />
                              <CategoryBar label="Treino" icon={Dumbbell} points={entry.points_training} maxPoints={maxCategoryPoints} color="#f59e0b" />
                              <CategoryBar label="Check-in" icon={CheckCircle2} points={entry.points_checkin} maxPoints={maxCategoryPoints} color="#8b5cf6" />
                              <CategoryBar label="Outros" icon={Sparkles} points={entry.points_other} maxPoints={maxCategoryPoints} color="#ec4899" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Como ganhar pontos</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5"><ClipboardCheck className="w-3.5 h-3.5 text-green-500" /> Completar checklist</div>
              <div className="flex items-center gap-1.5"><Utensils className="w-3.5 h-3.5 text-blue-500" /> Registrar refeições</div>
              <div className="flex items-center gap-1.5"><Dumbbell className="w-3.5 h-3.5 text-yellow-500" /> Treinar</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-500" /> Fazer check-in</div>
              <div className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-pink-500" /> Outras atividades</div>
              <div className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-500" /> Manter streak</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
