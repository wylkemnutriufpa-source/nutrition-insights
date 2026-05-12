import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { usePrestige } from "@v1/hooks/usePrestige";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@v1/components/ui/avatar";
import { Button } from "@v1/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { Badge } from "@v1/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@v1/components/ui/tooltip";
import {
  Crown, Trophy, TrendingUp, Flame, Utensils, Dumbbell,
  ClipboardCheck, CheckCircle2, Sparkles, Lock, Rocket, Bot,
  Palette, BarChart3, Users, Zap, Shield, ChevronDown, ChevronUp
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend
} from "recharts";
import PrestigeBadge from "@v1/components/prestige/PrestigeBadge";
import PodiumBadge from "@v1/components/prestige/PodiumBadge";
import OnlinePatientsWidget from "@v1/components/dashboard/OnlinePatientsWidget";
import ShareProgressButton from "@v1/components/social/ShareProgressButton";

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

// ─── Premium Metallic Medal SVG ─────────────────────────────
function MedalIcon({ position, size = 40 }: { position: number; size?: number }) {
  const configs = [
    {
      id: "gold", label: "1",
      base: "#D4A017", light: "#FFE066", mid: "#FFD700", dark: "#B8860B", deepDark: "#8B6914",
      shine: "#FFFACD", ribbon1: "#C62828", ribbon2: "#E53935", ribbonShine: "#EF5350",
      glow: "rgba(255,215,0,0.55)", starColor: "#FFF8DC",
    },
    {
      id: "silver", label: "2",
      base: "#8E8E8E", light: "#E8E8E8", mid: "#C0C0C0", dark: "#808080", deepDark: "#505050",
      shine: "#F5F5F5", ribbon1: "#1565C0", ribbon2: "#1E88E5", ribbonShine: "#42A5F5",
      glow: "rgba(192,192,192,0.5)", starColor: "#F0F0F0",
    },
    {
      id: "bronze", label: "3",
      base: "#8B5E3C", light: "#E8A96C", mid: "#CD7F32", dark: "#8B5E3C", deepDark: "#5D3A1A",
      shine: "#F0C8A0", ribbon1: "#2E7D32", ribbon2: "#43A047", ribbonShine: "#66BB6A",
      glow: "rgba(205,127,50,0.5)", starColor: "#FAEBD7",
    },
  ];
  const c = configs[position] || configs[2];
  const cx = size / 2;
  const cy = size / 2;
  const uid = `medal-${c.id}-${size}`;
  const svgH = size + 16;

  return (
    <motion.div
      className="relative inline-flex"
      animate={{
        rotateY: [0, 360],
        filter: [
          `drop-shadow(0 0 ${position === 0 ? 8 : 4}px ${c.glow})`,
          `drop-shadow(0 0 ${position === 0 ? 14 : 8}px ${c.glow})`,
          `drop-shadow(0 0 ${position === 0 ? 8 : 4}px ${c.glow})`,
        ],
      }}
      transition={{ rotateY: { duration: position === 0 ? 6 : 8, repeat: Infinity, ease: "linear" }, filter: { duration: position === 0 ? 2 : 3, repeat: Infinity, ease: "easeInOut" } }}
      style={{ perspective: 600 }}
    >
      <svg width={size} height={svgH} viewBox={`0 0 ${size} ${svgH}`}>
        <defs>
          {/* Metallic radial gradient */}
          <radialGradient id={`${uid}-body`} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor={c.shine} />
            <stop offset="25%" stopColor={c.light} />
            <stop offset="55%" stopColor={c.mid} />
            <stop offset="80%" stopColor={c.dark} />
            <stop offset="100%" stopColor={c.deepDark} />
          </radialGradient>
          {/* Ring metallic gradient */}
          <linearGradient id={`${uid}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c.light} />
            <stop offset="30%" stopColor={c.dark} />
            <stop offset="60%" stopColor={c.light} />
            <stop offset="100%" stopColor={c.dark} />
          </linearGradient>
          {/* Inner ring gradient */}
          <linearGradient id={`${uid}-inner`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={c.dark} />
            <stop offset="50%" stopColor={c.light} />
            <stop offset="100%" stopColor={c.dark} />
          </linearGradient>
          {/* Ribbon gradient */}
          <linearGradient id={`${uid}-ribbon`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={c.ribbonShine} />
            <stop offset="40%" stopColor={c.ribbon2} />
            <stop offset="100%" stopColor={c.ribbon1} />
          </linearGradient>
          {/* Specular highlight */}
          <radialGradient id={`${uid}-spec`} cx="38%" cy="28%" r="30%">
            <stop offset="0%" stopColor="white" stopOpacity="0.7" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          {/* Edge shadow */}
          <radialGradient id={`${uid}-shadow`} cx="50%" cy="50%" r="50%">
            <stop offset="80%" stopColor="transparent" />
            <stop offset="100%" stopColor={c.deepDark} stopOpacity="0.4" />
          </radialGradient>
        </defs>

        {/* Ribbons */}
        <polygon points={`${cx - 5},${size - 6} ${cx - 14},${svgH} ${cx - 3},${size + 2}`} fill={`url(#${uid}-ribbon)`} />
        <polygon points={`${cx + 5},${size - 6} ${cx + 14},${svgH} ${cx + 3},${size + 2}`} fill={`url(#${uid}-ribbon)`} />
        {/* Ribbon highlights */}
        <line x1={cx - 9} y1={size - 2} x2={cx - 12} y2={svgH - 2} stroke={c.ribbonShine} strokeWidth="0.6" opacity="0.5" />
        <line x1={cx + 9} y1={size - 2} x2={cx + 12} y2={svgH - 2} stroke={c.ribbonShine} strokeWidth="0.6" opacity="0.5" />

        {/* Outer metallic ring */}
        <circle cx={cx} cy={cy} r={cx - 1} fill={`url(#${uid}-ring)`} />
        {/* Main medal body */}
        <circle cx={cx} cy={cy} r={cx - 3} fill={`url(#${uid}-body)`} />
        {/* Edge shadow overlay */}
        <circle cx={cx} cy={cy} r={cx - 3} fill={`url(#${uid}-shadow)`} />
        {/* Inner decorative ring */}
        <circle cx={cx} cy={cy} r={cx - 6} fill="none" stroke={`url(#${uid}-inner)`} strokeWidth="1.2" opacity="0.7" />
        {/* Inner decorative ring 2 */}
        <circle cx={cx} cy={cy} r={cx - 8} fill="none" stroke={c.light} strokeWidth="0.4" opacity="0.35" />

        {/* Star decorations for gold */}
        {position === 0 && (
          <>
            {[0, 72, 144, 216, 288].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const sr = cx - 7;
              const sx = cx + Math.cos(rad) * sr;
              const sy = cy + Math.sin(rad) * sr;
              return (
                <circle key={i} cx={sx} cy={sy} r={1} fill={c.starColor} opacity="0.6" />
              );
            })}
          </>
        )}

        {/* Laurel leaf accents */}
        {position <= 2 && (
          <>
            <path d={`M${cx - 9},${cy + 7} Q${cx - 14},${cy} ${cx - 9},${cy - 7}`} fill="none" stroke={c.light} strokeWidth="1" opacity="0.4" />
            <path d={`M${cx + 9},${cy + 7} Q${cx + 14},${cy} ${cx + 9},${cy - 7}`} fill="none" stroke={c.light} strokeWidth="1" opacity="0.4" />
          </>
        )}

        {/* Specular highlight */}
        <circle cx={cx} cy={cy} r={cx - 3} fill={`url(#${uid}-spec)`} />
        {/* Small extra glint */}
        <ellipse cx={cx - size * 0.12} cy={cy - size * 0.15} rx={size * 0.06} ry={size * 0.03} fill="white" opacity="0.45" transform={`rotate(-25 ${cx - size * 0.12} ${cy - size * 0.15})`} />

        {/* Number */}
        <text x={cx} y={cy + size * 0.13} textAnchor="middle" fontSize={size * 0.36} fontWeight="800" fill={c.deepDark} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {c.label}
        </text>
        {/* Number highlight layer */}
        <text x={cx} y={cy + size * 0.13} textAnchor="middle" fontSize={size * 0.36} fontWeight="800" fill={c.light} opacity="0.25" dy="-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {c.label}
        </text>
      </svg>

      {/* Animated rotating shine overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden rounded-full"
        style={{ width: size, height: size }}
      >
        <motion.div
          className="absolute"
          style={{
            width: size * 0.3,
            height: size * 1.5,
            background: `linear-gradient(90deg, transparent, ${c.shine}40, transparent)`,
            top: -size * 0.25,
            left: -size * 0.3,
            transform: "rotate(25deg)",
          }}
          animate={{ left: [-size * 0.3, size * 1.3] }}
          transition={{ duration: position === 0 ? 2.5 : 3.5, repeat: Infinity, repeatDelay: position === 0 ? 1.5 : 3, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
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

// ─── Metallic color configs for bars ───────────────────────
const METALLIC_COLORS = {
  Checklist: { base: "#22c55e", light: "#6ee7a0", dark: "#15803d", shine: "#bbf7d0" },
  Refeições: { base: "#3b82f6", light: "#93c5fd", dark: "#1d4ed8", shine: "#dbeafe" },
  Treino: { base: "#f59e0b", light: "#fcd34d", dark: "#b45309", shine: "#fef3c7" },
  "Check-in": { base: "#8b5cf6", light: "#c4b5fd", dark: "#6d28d9", shine: "#ede9fe" },
  Outros: { base: "#ec4899", light: "#f9a8d4", dark: "#be185d", shine: "#fce7f3" },
} as const;

// ─── Animated Stacked Bar Chart (Top 10) ───────────────────
function TopPlayersChart({ ranking }: { ranking: RankEntry[] }) {
  const [animKey, setAnimKey] = useState(0);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [ranking]);

  const data = ranking.slice(0, 10).map((r) => ({
    name: r.display_name.length > 10 ? r.display_name.slice(0, 10) + "…" : r.display_name,
    Checklist: r.points_checklist,
    Refeições: r.points_meals,
    Treino: r.points_training,
    "Check-in": r.points_checkin,
    Outros: r.points_other,
  }));
  if (data.length === 0) return null;

  const barKeys = ["Checklist", "Refeições", "Treino", "Check-in", "Outros"] as const;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur overflow-hidden relative">
      {/* Subtle metallic shimmer overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, transparent 30%, hsla(0,0%,100%,0.03) 50%, transparent 70%)",
        }}
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
      />
      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-sm flex items-center gap-2">
          <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
            <BarChart3 className="w-4 h-4 text-primary" />
          </motion.div>
          Distribuição de Pontos — Top 10
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 relative z-10">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
            onMouseMove={(state: any) => {
              if (state?.activeTooltipIndex !== undefined) setHoveredBar(state.activeTooltipIndex);
            }}
            onMouseLeave={() => setHoveredBar(null)}
          >
            <defs>
              {barKeys.map((key) => {
                const mc = METALLIC_COLORS[key];
                return (
                  <linearGradient key={key} id={`metallic-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={mc.shine} stopOpacity={0.9} />
                    <stop offset="15%" stopColor={mc.light} stopOpacity={0.85} />
                    <stop offset="50%" stopColor={mc.base} />
                    <stop offset="85%" stopColor={mc.dark} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={mc.dark} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {barKeys.map((key, ki) => (
              <Bar
                key={`${key}-${animKey}`}
                dataKey={key}
                stackId="a"
                fill={`url(#metallic-${key})`}
                radius={ki === barKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                animationBegin={ki * 150}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fillOpacity={hoveredBar !== null && hoveredBar !== index ? 0.4 : 1}
                    stroke={hoveredBar === index ? METALLIC_COLORS[key].shine : "transparent"}
                    strokeWidth={hoveredBar === index ? 1 : 0}
                  />
                ))}
              </Bar>
            ))}
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
  const [showAll, setShowAll] = useState(false);
  const [hasPremium, setHasPremium] = useState<boolean | null>(null);
  const [nutritionistId, setNutritionistId] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(true);
  const shareRef = useRef<HTMLDivElement>(null);

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
        .maybeSingle()
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
    const params: any = { _period: p, _limit: 500 };
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
  const visibleRanking = showAll ? ranking : ranking.slice(0, 20);
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
      <div className="space-y-5 max-w-4xl mx-auto pb-10" ref={shareRef}>
        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold metallic-gold flex items-center gap-2">
              <Trophy className="w-7 h-7 text-yellow-400 drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" /> Ranking Global
            </h1>
            <p className="text-muted-foreground text-sm">
              Competição de engajamento — Top 20 • {PERIOD_LABELS[period]}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ShareProgressButton captureRef={shareRef} context="ranking" />
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
                            style={{
                              background: idx === 0
                                ? "linear-gradient(180deg, #B8860B, #FFD700 30%, #FFFACD 55%, #FFD700 80%, #B8860B)"
                                : idx === 1
                                ? "linear-gradient(180deg, #808080, #C0C0C0 30%, #E8E8E8 55%, #C0C0C0 80%, #808080)"
                                : "linear-gradient(180deg, #8B5E3C, #CD7F32 30%, #E8A96C 55%, #CD7F32 80%, #8B5E3C)",
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                              filter: idx === 0
                                ? "drop-shadow(0 2px 6px rgba(255,215,0,0.4))"
                                : "drop-shadow(0 1px 3px rgba(0,0,0,0.2))",
                            }}>
                            {entry.display_name}
                          </p>

                          {entry.plan_slug && (
                            <PodiumBadge
                              plan={allPrestigePlans.find(p => p.slug === entry.plan_slug) || null}
                              allPlans={allPrestigePlans}
                              position={idx}
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
                  <>
                  <AnimatePresence>
                    {visibleRanking.map((entry, i) => {
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

                  {ranking.length > 20 && (
                    <Button
                      variant="ghost"
                      className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground gap-2"
                      onClick={() => setShowAll(!showAll)}
                    >
                      {showAll ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Mostrar Top 20
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Ver todos ({ranking.length} pacientes)
                        </>
                      )}
                    </Button>
                  )}
                  </>
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
