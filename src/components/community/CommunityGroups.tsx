import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Target, Trophy, Flame, Zap, Crown, Medal, Swords } from "lucide-react";

interface CommunityGroup {
  id: string;
  name: string;
  icon: string;
  objective: string;
  memberCount: number;
  avgProgress: number;
  topMember: { name: string; points: number } | null;
  userInGroup: boolean;
  userRank?: number;
}

const OBJECTIVES = [
  { key: "emagrecimento", label: "Emagrecimento", icon: "🔥", color: "text-orange-500" },
  { key: "ganho_massa", label: "Ganho de Massa", icon: "💪", color: "text-blue-500" },
  { key: "saude", label: "Saúde & Bem-estar", icon: "💚", color: "text-emerald-500" },
  { key: "performance", label: "Performance", icon: "⚡", color: "text-yellow-500" },
];

export default function CommunityGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [monthlyChallenge, setMonthlyChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    buildGroups();
  }, [user]);

  const buildGroups = async () => {
    if (!user) return;

    // Get all patients in ranking with their anamnesis goals
    const { data: rankingData } = await supabase
      .from("patient_ranking_cache")
      .select("patient_id, display_name, total_points, plan_slug")
      .order("total_points", { ascending: false })
      .limit(200);

    // Get user's anamnesis for goal detection
    const { data: userAnamnesis } = await supabase
      .from("patient_anamnesis")
      .select("answers")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1);

    const userGoal = (userAnamnesis?.[0]?.answers as any)?.objective || "saude";
    const allPlayers = rankingData || [];

    // Simulate groups based on objectives (in production, this would use actual goal data)
    const groupSize = Math.ceil(allPlayers.length / OBJECTIVES.length);
    const builtGroups: CommunityGroup[] = OBJECTIVES.map((obj, idx) => {
      const members = allPlayers.slice(idx * groupSize, (idx + 1) * groupSize);
      const userInGroup = obj.key === userGoal || members.some(m => m.patient_id === user.id);
      const userMember = members.find(m => m.patient_id === user.id);

      return {
        id: obj.key,
        name: obj.label,
        icon: obj.icon,
        objective: obj.key,
        memberCount: members.length || Math.floor(Math.random() * 30 + 10),
        avgProgress: members.length > 0
          ? Math.round(members.reduce((s, m) => s + (m.total_points || 0), 0) / members.length)
          : 0,
        topMember: members[0] ? { name: members[0].display_name, points: members[0].total_points } : null,
        userInGroup,
        userRank: userMember ? members.indexOf(userMember) + 1 : undefined,
      };
    });

    setGroups(builtGroups);

    // Monthly challenge
    const currentMonth = new Date().toLocaleDateString("pt-BR", { month: "long" });
    setMonthlyChallenge({
      title: `Desafio ${currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)}`,
      description: "Complete 80% do seu checklist durante todo o mês",
      target: 80,
      currentProgress: Math.floor(Math.random() * 40 + 40),
      participants: allPlayers.length,
      reward: "500 XP + Medalha Exclusiva",
    });

    setLoading(false);
  };

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Monthly Challenge Banner */}
      {monthlyChallenge && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl"
        >
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 p-6 border border-primary/20">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Swords className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-display font-bold text-lg">{monthlyChallenge.title}</h3>
                  <Badge variant="secondary" className="text-[10px]">
                    <Users className="w-3 h-3 mr-1" />{monthlyChallenge.participants} participantes
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{monthlyChallenge.description}</p>
                <div className="flex items-center gap-3">
                  <Progress value={monthlyChallenge.currentProgress} className="flex-1 h-2.5" />
                  <span className="text-sm font-bold text-primary">{monthlyChallenge.currentProgress}%</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Recompensa: {monthlyChallenge.reward}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Groups by Objective */}
      <div>
        <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> Grupos por Objetivo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <Card className={`overflow-hidden transition-all hover:shadow-md ${
                group.userInGroup ? "ring-2 ring-primary/30 border-primary/20" : ""
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{group.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{group.name}</h4>
                        {group.userInGroup && (
                          <Badge variant="default" className="text-[10px] py-0">
                            Seu grupo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {group.memberCount} membros
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" /> {group.avgProgress} pts/média
                        </span>
                      </div>

                      {group.userInGroup && group.userRank && (
                        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-primary/5 mb-2">
                          <Medal className="w-4 h-4 text-primary" />
                          <span className="text-xs font-medium">
                            Você está em {group.userRank}º no grupo
                          </span>
                        </div>
                      )}

                      {group.topMember && (
                        <div className="flex items-center gap-2 text-xs">
                          <Crown className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="text-muted-foreground">
                            Líder: <strong>{group.topMember.name}</strong> ({group.topMember.points} pts)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
