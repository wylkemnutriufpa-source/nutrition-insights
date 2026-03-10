import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Trophy, Medal, Star, TrendingUp } from "lucide-react";
import { usePrestige } from "@/hooks/usePrestige";

interface RankEntry {
  patient_id: string;
  total_points: number;
  display_name: string;
  avatar_url: string | null;
  plan_slug: string | null;
  plan_color: string | null;
  crown_enabled: boolean | null;
  badge_icon: string | null;
  rank_position: number | null;
}

export default function GlobalRanking() {
  const { user } = useAuth();
  const { prestige } = usePrestige();
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Refresh cache then load
    supabase.rpc("refresh_ranking_cache").then(() => {
      supabase
        .from("patient_ranking_cache")
        .select("*")
        .order("rank_position", { ascending: true })
        .limit(100)
        .then(({ data }) => {
          setRanking((data as RankEntry[]) || []);
          setLoading(false);
        });
    });
  }, []);

  const myRank = ranking.find((r) => r.patient_id === user?.id);
  const podium = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  const podiumIcons = [
    <Trophy className="w-8 h-8 text-yellow-400" />,
    <Medal className="w-7 h-7 text-gray-400" />,
    <Medal className="w-6 h-6 text-amber-600" />,
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-7 h-7 text-accent" /> Ranking Global
          </h1>
          <p className="text-muted-foreground text-sm">
            Engajamento dos pacientes na plataforma
          </p>
        </div>

        {/* My Position */}
        {myRank && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                  #{myRank.rank_position}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Sua posição</p>
                  <p className="font-bold text-lg">{prestige.totalPoints} pontos</p>
                </div>
                <TrendingUp className="w-5 h-5 text-primary" />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Podium */}
        {podium.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[1, 0, 2].map((idx) => {
              const entry = podium[idx];
              if (!entry) return <div key={idx} />;
              const isFirst = idx === 0;
              return (
                <motion.div
                  key={entry.patient_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex flex-col items-center ${isFirst ? "order-1 -mt-4" : idx === 1 ? "order-0 mt-4" : "order-2 mt-6"}`}
                >
                  <div className="relative">
                    <Avatar className={`${isFirst ? "w-20 h-20" : "w-14 h-14"} border-2`} style={{ borderColor: entry.plan_color || "#6b7280" }}>
                      <AvatarImage src={entry.avatar_url || undefined} />
                      <AvatarFallback className="text-lg">{entry.display_name[0]}</AvatarFallback>
                    </Avatar>
                    {entry.crown_enabled && (
                      <Crown className="absolute -top-2 -right-1 w-5 h-5" style={{ color: entry.plan_color || "#f59e0b" }} />
                    )}
                  </div>
                  <div className="mt-2">{podiumIcons[idx]}</div>
                  <p className="text-sm font-semibold mt-1 text-center truncate max-w-full" style={{ color: entry.plan_color || undefined }}>
                    {entry.display_name}
                  </p>
                  <span className="text-xs text-muted-foreground">{entry.total_points} pts</span>
                  {entry.badge_icon && <span className="text-sm">{entry.badge_icon}</span>}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Rest of ranking */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-accent" /> Classificação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : rest.length === 0 && podium.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum participante no ranking ainda.
              </p>
            ) : (
              <AnimatePresence>
                {rest.map((entry, i) => {
                  const isMe = entry.patient_id === user?.id;
                  return (
                    <motion.div
                      key={entry.patient_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        isMe ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
                      } ${entry.ranking_highlight ? "border border-border" : ""}`}
                      style={entry.ranking_highlight ? { borderColor: entry.plan_color + "40" } : undefined}
                    >
                      <span className="w-8 text-center text-sm font-bold text-muted-foreground">
                        {entry.rank_position}
                      </span>
                      <div className="relative">
                        <Avatar className="w-9 h-9" style={entry.plan_color ? { borderColor: entry.plan_color, borderWidth: 2 } : undefined}>
                          <AvatarImage src={entry.avatar_url || undefined} />
                          <AvatarFallback>{entry.display_name[0]}</AvatarFallback>
                        </Avatar>
                        {entry.crown_enabled && (
                          <Crown className="absolute -top-1 -right-1 w-3.5 h-3.5" style={{ color: entry.plan_color || "#f59e0b" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={entry.plan_color ? { color: entry.plan_color } : undefined}>
                          {entry.display_name}
                        </p>
                        <span className="text-xs text-muted-foreground">{entry.badge_icon} {entry.plan_slug}</span>
                      </div>
                      <span className="text-sm font-bold">{entry.total_points} <span className="text-xs text-muted-foreground">pts</span></span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
