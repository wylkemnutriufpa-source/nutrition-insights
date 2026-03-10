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
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Crown, Trophy, TrendingUp, Flame, Utensils, Dumbbell,
  ClipboardCheck, CheckCircle2, Sparkles, Lock, Rocket, Bot,
  Palette, BarChart3, Users, Zap, Shield, ChevronDown, ChevronUp
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend
} from "recharts";
import PrestigeBadge from "@/components/prestige/PrestigeBadge";
import OnlinePatientsWidget from "@/components/dashboard/OnlinePatientsWidget";

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

const CATEGORY_CONFIG = [
  { key: "points_checklist", label: "Checklist", icon: ClipboardCheck, color: "#22c55e" },
  { key: "points_meals", label: "Refeições", icon: Utensils, color: "#3b82f6" },
  { key: "points_training", label: "Treino", icon: Dumbbell, color: "#f59e0b" },
  { key: "points_checkin", label: "Check-in", icon: CheckCircle2, color: "#8b5cf6" },
  { key: "points_other", label: "Outros", icon: Sparkles, color: "#ec4899" },
] as const;

// ─── Medal SVG ─────────────────────────────────────────────
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
      <polygon points={`${r - 6},${size - 4} ${r - 12},${size + 10} ${r - 2},${size + 4}`} fill={c.ribbon} />
      <polygon points={`${r + 6},${size - 4} ${r + 12},${size + 10} ${r + 2},${size + 4}`} fill={c.ribbon} />
      <circle cx={r} cy={r} r={r} fill={c.glow} />
      <circle cx={r} cy={r} r={r - 2} fill={c.outer} stroke={c.inner} strokeWidth="2" />
      <circle cx={r} cy={r} r={r - 6} fill="none" stroke={c.inner} strokeWidth="1" opacity="0.5" />
      <path d={`M${r - 8},${r + 6} Q${r - 12},${r} ${r - 8},${r - 6}`} fill="none" stroke={c.inner} strokeWidth="1.5" opacity="0.6" />
      <path d={`M${r + 8},${r + 6} Q${r + 12},${r} ${r + 8},${r - 6}`} fill="none" stroke={c.inner} strokeWidth="1.5" opacity="0.6" />
      <text x={r} y={r + 5} textAnchor="middle" fontSize={size * 0.38} fontWeight="bold" fill={c.text}>
        {position + 1}
      </text>
    </svg>
  );
}

// ─── Category Bar ──────────────────────────────────────────
function CategoryBar({ label, icon: Icon, points, maxPoints, color }: {
  label: string; icon: React.ElementType; points: number; maxPoints: number; color: string;
}) {
  const pct = maxPoints > 0 ? Math.min((points / maxPoints) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
      <span className="w-16 truncate text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="w-10 text-right font-semibold tabular-nums">{points}</span>
    </div>
  );
}

// ─── Stacked Bar Chart (Top 10) ────────────────────────────
function TopPlayersChart({ ranking }: { ranking: RankEntry[] }) {
  const data = ranking.slice(0, 10).map((r) => ({
    name: r.display_name.length > 10 ? r.display_name.slice(0, 10) + "…" : r.display_name,
    Checklist: r.points_checklist,
    Refeições: r.points_meals,
    Treino: r.points_training,
    "Check-in": r.points_checkin,
    Outros: r.points_other,
  }));
  if (data.length === 0) return null;
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Distribuição de Pontos — Top 10
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Checklist" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Refeições" stackId="a" fill="#3b82f6" />
            <Bar dataKey="Treino" stackId="a" fill="#f59e0b" />
            <Bar dataKey="Check-in" stackId="a" fill="#8b5cf6" />
            <Bar dataKey="Outros" stackId="a" fill="#ec4899" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Radar Chart (selected player) ─────────────────────────
function PlayerRadar({ entry }: { entry: RankEntry }) {
  const data = CATEGORY_CONFIG.map((c) => ({
    category: c.label,
    points: (entry as any)[c.key] || 0,
  }));
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <Radar dataKey="points" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// ─── Summary Stats Row ─────────────────────────────────────
function RankingStats({ ranking, period }: { ranking: RankEntry[]; period: Period }) {
  const totalPoints = ranking.reduce((s, r) => s + r.total_points, 0);
  const avgPoints = ranking.length > 0 ? Math.round(totalPoints / ranking.length) : 0;
  const topScore = ranking[0]?.total_points || 0;
  const stats = [
    { label: "Participantes", value: ranking.length, icon: Users },
    { label: "Total de Pontos", value: totalPoints.toLocaleString("pt-BR"), icon: Zap },
    { label: "Média", value: avgPoints, icon: TrendingUp },
    { label: "Líder", value: topScore, icon: Crown },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="border-border/40 bg-card/60 backdrop-blur">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <s.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold font-display leading-none">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
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
  const [showChart, setShowChart] = useState(true);

  // ── Premium & tenant check ──
  useEffect(() => {
    if (!user) return;
    if (isAdmin) { setHasPremium(true); return; }
    if (isPatient) {
      setHasPremium(true);
      supabase
        .from("nutritionist_patients")
        .select("nutritionist_id")
        .eq("patient_id", user.id)
        .eq("status", "active")
        .limit(1)
        .single()
        .then(({ data }) => { if (data) setNutritionistId(data.nutritionist_id); });
      return;
    }
    if (isNutritionist) {
      setNutritionistId(user.id);
      checkNutritionistPremium(user.id);
    }
  }, [user, isAdmin, isPatient, isNutritionist]);

  async function checkNutritionistPremium(nutId: string) {
    const { data: featureRow } = await supabase
      .from("professional_feature_usage" as any)
      .select("status")
      .eq("nutritionist_id", nutId)
      .eq("feature_name", "ranking_global")
      .maybeSingle();
    if (featureRow && (featureRow as any).status === "enabled") { setHasPremium(true); return; }
    const { data: profile } = await supabase
      .from("professional_profiles")
      .select("plan_id, pricing_plans:plan_id(slug)")
      .eq("user_id", nutId)
      .maybeSingle();
    const planSlug = (profile as any)?.pricing_plans?.slug;
    setHasPremium(planSlug === "premium" || planSlug === "enterprise" || planSlug === "pro");
  }

  // ── Load ranking ──
  const loadRanking = useCallback(async (p: Period) => {
    setLoading(true);
    const params: any = { _period: p, _limit: 20 };
    if (nutritionistId && !isAdmin) params._nutritionist_id = nutritionistId;
    const { data, error } = await supabase.rpc("get_ranking_by_period", params);
    if (!error && data) setRanking(data as RankEntry[]);
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

  // ── Premium Gate ──
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
                {[
                  { icon: Trophy, label: "Ranking Global", color: "text-warning" },
                  { icon: Sparkles, label: "Features de IA", color: "text-primary" },
                  { icon: Rocket, label: "Programas", color: "text-primary" },
                  { icon: Bot, label: "Automações", color: "text-primary" },
                  { icon: Palette, label: "Branding", color: "text-primary" },
                  { icon: BarChart3, label: "Inteligência Clínica", color: "text-primary" },
                  { icon: Users, label: "Perfil Público", color: "text-primary" },
                  { icon: Zap, label: "IA Expandida", color: "text-primary" },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2">
                    <f.icon className={`w-4 h-4 ${f.color}`} /> {f.label}
                  </div>
                ))}
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
              Peça ao seu nutricionista para ativar o plano Premium.
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
      <div className="space-y-5 max-w-4xl mx-auto pb-10">
        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-7 h-7 text-yellow-400" /> Ranking Global
            </h1>
            <p className="text-muted-foreground text-sm">
              Competição de engajamento — Top 20 • {PERIOD_LABELS[period]}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <OnlinePatientsWidget variant="badge" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-xs text-muted-foreground">
                    <Flame className="w-3.5 h-3.5 text-orange-400" /> 30min
                  </div>
                </TooltipTrigger>
                <TooltipContent><p>Ranking atualiza a cada 30 minutos</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* ── Period Tabs ── */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="w-full grid grid-cols-4 h-10">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <TabsTrigger key={p} value={p} className="text-sm font-medium">
                {PERIOD_LABELS[p]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* ── My Position ── */}
        {myRank && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/8 to-primary/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
              <CardContent className="p-4 flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center">
                  <span className="text-xl font-bold font-display text-primary">#{myRank.rank_position}</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Sua posição — {PERIOD_LABELS[period]}</p>
                  <p className="font-display font-bold text-xl">{myRank.total_points.toLocaleString("pt-BR")} <span className="text-sm font-normal text-muted-foreground">pontos</span></p>
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

        {/* ── Loading ── */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!loading && (
          <>
            {/* ── Stats Row ── */}
            <RankingStats ranking={ranking} period={period} />

            {/* ── Podium ── */}
            {podium.length > 0 && (
              <Card className="border-border/40 bg-gradient-to-b from-card to-card/80 overflow-hidden">
                <CardHeader className="pb-0 pt-5">
                  <CardTitle className="text-sm flex items-center gap-2 text-center justify-center">
                    <Trophy className="w-4 h-4 text-yellow-400" /> Pódio
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-5">
                  <div className="grid grid-cols-3 gap-2 pt-6 pb-2">
                    {[1, 0, 2].map((idx) => {
                      const entry = podium[idx];
                      if (!entry) return <div key={idx} />;
                      const isFirst = idx === 0;
                      const medalSize = isFirst ? 52 : 40;
                      const isExpanded = expandedId === entry.patient_id;
                      return (
                        <motion.div
                          key={entry.patient_id}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.12, type: "spring", stiffness: 200 }}
                          className={`flex flex-col items-center cursor-pointer ${
                            isFirst ? "order-1 -mt-4" : idx === 1 ? "order-0 mt-4" : "order-2 mt-6"
                          }`}
                          onClick={() => setExpandedId(isExpanded ? null : entry.patient_id)}
                        >
                          <div className="relative">
                            <Avatar
                              className={`${isFirst ? "w-20 h-20" : "w-14 h-14"} border-2 shadow-lg transition-transform hover:scale-105`}
                              style={{ borderColor: entry.plan_color || "hsl(var(--border))" }}
                            >
                              <AvatarImage src={entry.avatar_url || undefined} />
                              <AvatarFallback className={`${isFirst ? "text-xl" : "text-base"} font-bold bg-muted`}>
                                {entry.display_name?.[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                            {entry.crown_enabled && (
                              <Crown
                                className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 drop-shadow animate-pulse"
                                style={{ color: entry.plan_color || "#f59e0b" }}
                              />
                            )}
                          </div>

                          <div className="mt-1">
                            <MedalIcon position={idx} size={medalSize} />
                          </div>

                          <p className="text-sm font-bold mt-0.5 text-center truncate max-w-[110px]"
                            style={{ color: entry.plan_color || undefined }}>
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

                          <span className="text-base font-bold mt-1 tabular-nums">
                            {entry.total_points.toLocaleString("pt-BR")}
                            <span className="text-xs text-muted-foreground ml-1">pts</span>
                          </span>

                          {/* Expanded: radar + bars */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="w-full mt-2 space-y-1 overflow-hidden"
                              >
                                <PlayerRadar entry={entry} />
                                {CATEGORY_CONFIG.map((c) => (
                                  <CategoryBar
                                    key={c.key}
                                    label={c.label}
                                    icon={c.icon}
                                    points={(entry as any)[c.key] || 0}
                                    maxPoints={maxCategoryPoints}
                                    color={c.color}
                                  />
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Chart Toggle ── */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Analytics
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChart(!showChart)}
                className="text-xs gap-1"
              >
                {showChart ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showChart ? "Ocultar" : "Mostrar"}
              </Button>
            </div>

            <AnimatePresence>
              {showChart && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <TopPlayersChart ranking={ranking} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Full Ranking List (All 20) ── */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" /> Classificação Completa — {PERIOD_LABELS[period]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0.5">
                {ranking.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                      <Trophy className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Nenhum participante com pontos neste período.
                    </p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {ranking.map((entry, i) => {
                      const isMe = entry.patient_id === user?.id;
                      const isExpanded = expandedId === entry.patient_id;
                      const isPodium = i < 3;
                      return (
                        <motion.div
                          key={entry.patient_id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.015 }}
                          className={`rounded-xl transition-all cursor-pointer ${
                            isMe
                              ? "bg-primary/8 border border-primary/25 shadow-sm"
                              : isPodium
                              ? "bg-muted/30 hover:bg-muted/50"
                              : "hover:bg-muted/30"
                          }`}
                          onClick={() => setExpandedId(isExpanded ? null : entry.patient_id)}
                        >
                          <div className="flex items-center gap-3 p-3">
                            {/* Rank Number */}
                            <div className={`w-8 text-center ${
                              isPodium
                                ? "text-sm font-bold"
                                : "text-sm font-medium text-muted-foreground"
                            }`}>
                              {isPodium ? (
                                <span className={
                                  i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : "text-amber-600"
                                }>
                                  {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                                </span>
                              ) : (
                                entry.rank_position
                              )}
                            </div>

                            {/* Avatar */}
                            <div className="relative">
                              <Avatar
                                className="w-9 h-9 transition-transform hover:scale-110"
                                style={entry.plan_color ? { borderColor: entry.plan_color, borderWidth: 2 } : undefined}
                              >
                                <AvatarImage src={entry.avatar_url || undefined} />
                                <AvatarFallback className="text-xs font-bold">{entry.display_name?.[0] || "?"}</AvatarFallback>
                              </Avatar>
                              {entry.crown_enabled && (
                                <Crown className="absolute -top-1 -right-1 w-3.5 h-3.5" style={{ color: entry.plan_color || "#f59e0b" }} />
                              )}
                            </div>

                            {/* Name + Badge */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" style={entry.plan_color ? { color: entry.plan_color } : undefined}>
                                {entry.display_name}
                                {isMe && (
                                  <Badge variant="outline" className="ml-2 text-[9px] px-1.5 py-0 border-primary/40 text-primary">
                                    Você
                                  </Badge>
                                )}
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

                            {/* Points + mini bars */}
                            <div className="text-right">
                              <span className="text-sm font-bold tabular-nums">
                                {entry.total_points.toLocaleString("pt-BR")}
                              </span>
                              <span className="text-[10px] text-muted-foreground ml-1">pts</span>
                              {/* Mini category dots */}
                              <div className="flex gap-0.5 justify-end mt-1">
                                {CATEGORY_CONFIG.map((c) => {
                                  const val = (entry as any)[c.key] || 0;
                                  const maxVal = entry.total_points || 1;
                                  const w = Math.max(2, (val / maxVal) * 24);
                                  return (
                                    <div
                                      key={c.key}
                                      className="h-1.5 rounded-full"
                                      style={{ backgroundColor: c.color, width: w, opacity: val > 0 ? 1 : 0.2 }}
                                    />
                                  );
                                })}
                              </div>
                            </div>

                            {/* Expand arrow */}
                            <ChevronDown
                              className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </div>

                          {/* Expanded breakdown */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-3 pb-3 overflow-hidden"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  <div className="space-y-1.5">
                                    {CATEGORY_CONFIG.map((c) => (
                                      <CategoryBar
                                        key={c.key}
                                        label={c.label}
                                        icon={c.icon}
                                        points={(entry as any)[c.key] || 0}
                                        maxPoints={maxCategoryPoints}
                                        color={c.color}
                                      />
                                    ))}
                                  </div>
                                  <PlayerRadar entry={entry} />
                                </div>
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

            {/* ── How to earn points ── */}
            <Card className="border-border/40">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Como ganhar pontos
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  {[
                    { icon: ClipboardCheck, label: "Completar checklist", pts: "10 pts", color: "#22c55e" },
                    { icon: Utensils, label: "Registrar refeições", pts: "5 pts", color: "#3b82f6" },
                    { icon: Dumbbell, label: "Concluir treinos", pts: "15 pts", color: "#f59e0b" },
                    { icon: CheckCircle2, label: "Fazer check-in", pts: "25 pts", color: "#8b5cf6" },
                    { icon: Flame, label: "Manter streak", pts: "20 pts", color: "#f97316" },
                    { icon: Sparkles, label: "Outras atividades", pts: "3-50 pts", color: "#ec4899" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <item.icon className="w-4 h-4 shrink-0" style={{ color: item.color }} />
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.pts}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
