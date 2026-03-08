import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Target, Clock, CheckCircle2, Zap } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Challenge = Tables<"challenges">;
type UserChallenge = Tables<"user_challenges">;

export default function Challenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<Map<string, UserChallenge>>(new Map());

  const fetchData = async () => {
    const { data: ch } = await supabase.from("challenges").select("*").eq("is_global", true);
    setChallenges(ch || []);

    if (user) {
      const { data: uc } = await supabase.from("user_challenges").select("*").eq("user_id", user.id);
      setUserChallenges(new Map((uc || []).map(u => [u.challenge_id, u])));
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Target className="w-7 h-7 text-primary" /> Desafios
          </h1>
          <p className="text-muted-foreground text-sm">Aceite desafios e ganhe XP extra!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map((ch) => {
            const uc = userChallenges.get(ch.id);
            const joined = !!uc;
            const completed = uc?.status === "completed";
            const progress = uc ? Math.min((uc.progress / ch.target_value) * 100, 100) : 0;

            return (
              <motion.div
                key={ch.id}
                whileHover={{ y: -2 }}
                className={`glass rounded-xl p-5 shadow-card ${completed ? "ring-2 ring-success/30" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{ch.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold">{ch.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{ch.description}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {ch.duration_days} dias
                    </span>
                    <span className="font-bold text-primary flex items-center gap-1">
                      <Zap className="w-3 h-3" /> +{ch.xp_reward} XP
                    </span>
                  </div>

                  {joined && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{uc.progress}/{ch.target_value}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {completed ? (
                    <div className="flex items-center gap-2 text-success text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Completado!
                    </div>
                  ) : joined ? (
                    <div className="text-xs text-muted-foreground">Em andamento...</div>
                  ) : (
                    <Button
                      onClick={() => joinChallenge(ch.id)}
                      className="w-full gradient-primary mt-2"
                      size="sm"
                    >
                      Aceitar Desafio
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
