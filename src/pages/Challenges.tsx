import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Target, Clock, CheckCircle2, Zap, Users, Trophy, Swords, Crown, HelpCircle, Star, TrendingUp, Award } from "lucide-react";
import CommunityGroups from "@/components/community/CommunityGroups";
import type { Tables } from "@/integrations/supabase/types";

type Challenge = Tables<"challenges">;
type UserChallenge = Tables<"user_challenges">;

interface LeagueInfo {
  name: string;
  icon: string;
  color: string;
  minPoints: number;
}

const LEAGUES: LeagueInfo[] = [
  { name: "Bronze", icon: "🥉", color: "text-orange-400", minPoints: 0 },
  { name: "Prata", icon: "🥈", color: "text-gray-400", minPoints: 200 },
  { name: "Ouro", icon: "🥇", color: "text-yellow-500", minPoints: 500 },
  { name: "Diamante", icon: "💎", color: "text-blue-400", minPoints: 1000 },
  { name: "Lenda", icon: "👑", color: "text-purple-500", minPoints: 2500 },
];

function getLeague(points: number): LeagueInfo {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (points >= LEAGUES[i].minPoints) return LEAGUES[i];
  }
  return LEAGUES[0];
}

export default function Challenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<Map<string, UserChallenge>>(new Map());
  const [totalPoints, setTotalPoints] = useState(0);
  const [monthlyRank, setMonthlyRank] = useState<any[]>([]);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const fetchData = async () => {
    const { data: ch } = await supabase.from("challenges").select("*").eq("is_global", true);
    setChallenges(ch || []);

    if (user) {
      const [ucRes, pointsRes, rankRes] = await Promise.all([
        supabase.from("user_challenges").select("*").eq("user_id", user.id),
        supabase.from("patient_points").select("points").eq("patient_id", user.id),
        supabase.rpc("get_ranking_by_period", { _period: "monthly", _limit: 5 }),
      ]);

      setUserChallenges(new Map((ucRes.data || []).map((u: any) => [u.challenge_id, u])));
      setTotalPoints((pointsRes.data || []).reduce((s: number, p: any) => s + (p.points || 0), 0));
      setMonthlyRank(rankRes.data || []);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const joinChallenge = async (challengeId: string) => {
    if (!user) return;
    const { error } = await supabase.from("user_challenges").insert({
      user_id: user.id,
      challenge_id: challengeId,
    });
    if (error) {
      toast.error("Erro ao entrar no desafio");
    } else {
      toast.success("Desafio aceito! 🔥");
      fetchData();
    }
  };

  const league = getLeague(totalPoints);
  const nextLeague = LEAGUES[LEAGUES.indexOf(league) + 1];
  const leagueProgress = nextLeague
    ? Math.round(((totalPoints - league.minPoints) / (nextLeague.minPoints - league.minPoints)) * 100)
    : 100;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Swords className="w-7 h-7 text-primary" /> Desafios & Ligas
            </h1>
            <p className="text-muted-foreground text-sm">Compete, evolua e suba de liga!</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowHowItWorks(true)}>
            <HelpCircle className="w-4 h-4" /> Como funciona?
          </Button>
        </div>

        {/* How It Works Modal */}
        <Dialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Swords className="w-6 h-6 text-primary" /> Como funcionam Desafios & Ligas
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Desafios</h4>
                  <p className="text-xs text-muted-foreground">Aceite desafios para cumprir metas específicas (hidratação, treinos, checklist). Cada desafio tem duração e recompensa em XP.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Pontuação</h4>
                  <p className="text-xs text-muted-foreground">Ganhe pontos completando tarefas do checklist, check-ins, refeições e desafios. Pontos acumulam para subir de liga.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Ligas</h4>
                  <p className="text-xs text-muted-foreground">Existem 5 ligas: Bronze → Prata → Ouro → Diamante → Lenda. Suba acumulando pontos ao longo do tempo.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Ranking Mensal</h4>
                  <p className="text-xs text-muted-foreground">Compete com outros pacientes no ranking mensal. Os Top 5 aparecem em destaque. Seu progresso é reiniciado a cada mês.</p>
                </div>
              </div>
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Dica:</strong> A consistência vale mais que intensidade! Manter streak e adesão diária rende mais pontos do que ações isoladas.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* League Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-premium rounded-2xl p-5 shimmer-sweep"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-3xl">{league.icon}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sua Liga</p>
                <p className={`font-display font-bold text-xl ${league.color}`}>{league.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Pontos Totais</p>
              <p className="font-display font-bold text-xl">{totalPoints.toLocaleString()}</p>
            </div>
          </div>

          {nextLeague && (
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>{league.icon} {league.name}</span>
                <span>{nextLeague.icon} {nextLeague.name} ({nextLeague.minPoints} pts)</span>
              </div>
              <Progress value={leagueProgress} className="h-2" />
              <p className="text-[10px] text-muted-foreground mt-1 text-center">
                Faltam {nextLeague.minPoints - totalPoints} pontos para subir de liga
              </p>
            </div>
          )}
          {!nextLeague && (
            <p className="text-center text-sm text-primary font-semibold mt-2">
              👑 Você está na liga máxima! Lenda!
            </p>
          )}
        </motion.div>

        {/* Monthly Top 5 */}
        {monthlyRank.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl p-4 shadow-card"
          >
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-warning" />
              <h3 className="font-display font-semibold text-sm">Top 5 do Mês</h3>
            </div>
            <div className="space-y-2">
              {monthlyRank.map((r: any, i: number) => {
                const isMe = r.patient_id === user?.id;
                const rLeague = getLeague(Number(r.total_points));
                return (
                  <div
                    key={r.patient_id}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      isMe ? "bg-primary/10 ring-1 ring-primary/30" : "bg-card"
                    }`}
                  >
                    <span className="font-bold text-sm w-5 text-center">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </span>
                    <span className="text-sm">{rLeague.icon}</span>
                    <span className="text-sm font-medium flex-1 truncate">
                      {r.display_name} {isMe && "(você)"}
                    </span>
                    <span className="text-xs font-bold text-primary">{Number(r.total_points).toLocaleString()} pts</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Challenges */}
        <div>
          <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-primary" /> Desafios Ativos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map((ch) => {
              const uc = userChallenges.get(ch.id);
              const joined = !!uc;
              const completed = uc?.status === "completed";
              const pct = joined ? Math.round(((uc as any)?.current_value || 0) / ch.target_value * 100) : 0;

              return (
                <motion.div
                  key={ch.id}
                  whileHover={{ scale: 1.01 }}
                  className={`glass rounded-xl p-4 shadow-card transition-all ${
                    completed ? "ring-2 ring-success/30" : joined ? "ring-1 ring-primary/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{ch.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-display font-semibold text-sm">{ch.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{ch.description}</p>

                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" /> {ch.duration_days} dias
                        <Zap className="w-3 h-3 ml-2" /> +{ch.xp_reward} XP
                      </div>

                      {joined && (
                        <div className="mt-2">
                          <Progress value={Math.min(pct, 100)} className="h-1.5" />
                          <p className="text-[10px] text-primary mt-0.5">{pct}% concluído</p>
                        </div>
                      )}

                      {completed && (
                        <span className="inline-flex items-center gap-1 text-[10px] mt-2 bg-success/10 text-success px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Completo!
                        </span>
                      )}

                      {!joined && (
                        <Button size="sm" className="mt-3 gradient-primary shadow-glow gap-1 text-xs" onClick={() => joinChallenge(ch.id)}>
                          <Zap className="w-3 h-3" /> Aceitar
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {challenges.length === 0 && (
              <div className="col-span-full text-center py-8">
                <Target className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Nenhum desafio disponível no momento.</p>
              </div>
            )}
          </div>
        </div>

        {/* Community Groups */}
        <CommunityGroups />
      </div>
    </DashboardLayout>
  );
}
