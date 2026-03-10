import { usePrestige } from "@/hooks/usePrestige";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import PrestigeBadge from "./PrestigeBadge";

export default function RankingWidget() {
  const { prestige, loading } = usePrestige();

  if (loading) return null;

  return (
    <Link to="/ranking">
      <Card className="hover:border-primary/30 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Ranking Global</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">{prestige.totalPoints} pts</p>
                {prestige.rank && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    #{prestige.rank}
                  </span>
                )}
              </div>
            </div>
            {prestige.plan && <PrestigeBadge plan={prestige.plan} size="sm" showLabel={false} />}
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
