import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePrestige } from "@/hooks/usePrestige";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Trophy, TrendingUp, Flame, Utensils, Dumbbell, ClipboardCheck, CheckCircle2, Sparkles } from "lucide-react";
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
  const { user } = useAuth();
  const { plans: allPrestigePlans } = usePrestige();
  const [period, setPeriod] = useState<Period>("monthly");
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadRanking = useCallback(async (p: Period) => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_ranking_by_period", {
      _period: p,
      _limit: 20,
    });
    if (!error && data) {
      setRanking(data as RankEntry[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRanking(period);
    // Auto-refresh every 30 minutes
    const interval = setInterval(() => loadRanking(period), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [period, loadRanking]);

  const myRank = ranking.find((r) => r.patient_id === user?.id);
  const podium = ranking.slice(0, 3);
  const rest = ranking.slice(3, 20);

  const maxCategoryPoints = Math.max(
    ...ranking.map(r => Math.max(r.points_checklist, r.points_meals, r.points_training, r.points_checkin, r.points_other)),
    1
  );

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
                  <Badge variant="outline" style={{ borderColor: myRank.plan_color || undefined, color: myRank.plan_color || undefined }}>
                    {myRank.badge_icon} {PLAN_LABELS[myRank.plan_slug] || myRank.plan_slug}
                  </Badge>
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
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 mt-0.5"
                      style={{ borderColor: (entry.plan_color || "#666") + "60", color: entry.plan_color || undefined }}
                    >
                      {entry.badge_icon} {PLAN_LABELS[entry.plan_slug] || entry.plan_slug}
                    </Badge>
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
                              <span className="text-xs text-muted-foreground">
                                {entry.badge_icon} {PLAN_LABELS[entry.plan_slug] || entry.plan_slug}
                              </span>
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
