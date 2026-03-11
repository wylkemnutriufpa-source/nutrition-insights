import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Trophy, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import PrestigeBadge from "./PrestigeBadge";

export default function RankingWidget() {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) { setLoaded(true); return; }

    Promise.allSettled([
      supabase.from("patient_ranking_cache").select("total_points, rank_position").eq("patient_id", user.id).maybeSingle(),
      supabase.from("patient_prestige").select("*, prestige_plans(*)").eq("patient_id", user.id).eq("is_active", true).maybeSingle(),
    ]).then(([rankRes, prestigeRes]) => {
      if (rankRes.status === "fulfilled" && rankRes.value.data) {
        setPoints(rankRes.value.data.total_points || 0);
        setRank(rankRes.value.data.rank_position || null);
      }
      if (prestigeRes.status === "fulfilled" && prestigeRes.value.data?.prestige_plans) {
        setPlan(prestigeRes.value.data.prestige_plans);
      }
      setLoaded(true);
    });
  }, [user]);

  return (
    <Link to="/ranking">
      <div className="glass-premium rounded-xl p-4 cursor-pointer metric-glow transition-all duration-300 shimmer-sweep h-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Ranking Global</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-display font-bold counter-animate">
                {loaded ? `${points} pts` : "..."}
              </p>
              {rank && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  #{rank}
                </span>
              )}
            </div>
          </div>
          {plan && <PrestigeBadge plan={plan} size="sm" showLabel={false} />}
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}
