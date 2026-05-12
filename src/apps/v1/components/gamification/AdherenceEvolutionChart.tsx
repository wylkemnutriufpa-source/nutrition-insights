import { useMemo } from "react";
import { useAdherenceScore } from "@v1/hooks/queries/useEngagement";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function AdherenceEvolutionChart() {
  const { data: history = [] } = useAdherenceScore();

  const chartData = useMemo(() => {
    return [...history]
      .reverse()
      .map((d) => ({
        date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        score: Math.round(Number(d.total_score) || 0),
        checklist: Math.round(Number(d.checklist_score) || 0),
        meals: Math.round(Number(d.meals_score) || 0),
        streak: d.streak_days ?? 0,
      }));
  }, [history]);

  if (chartData.length < 2) return null;

  const latest = chartData[chartData.length - 1];
  const previous = chartData[chartData.length - 2];
  const trend = latest.score - previous.score;

  const getTrendInfo = () => {
    if (trend > 5) return { icon: TrendingUp, label: "Subindo", color: "text-green-500" };
    if (trend < -5) return { icon: TrendingDown, label: "Caindo", color: "text-red-500" };
    return { icon: Minus, label: "Estável", color: "text-yellow-500" };
  };
  const trendInfo = getTrendInfo();
  const TrendIcon = trendInfo.icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Evolução da Aderência</CardTitle>
          <Badge variant="outline" className={`gap-1 ${trendInfo.color}`}>
            <TrendIcon className="h-3 w-3" />
            {trendInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = { score: "Score Total", checklist: "Checklist", meals: "Refeições" };
                  return [`${value}%`, labels[name] || name];
                }}
              />
              <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="url(#scoreGradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="checklist" stroke="hsl(var(--chart-2))" fill="none" strokeWidth={1} strokeDasharray="4 4" />
              <Area type="monotone" dataKey="meals" stroke="hsl(var(--chart-3))" fill="none" strokeWidth={1} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-primary rounded" /> Score
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-t border-dashed border-[hsl(var(--chart-2))]" /> Checklist
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-t border-dashed border-[hsl(var(--chart-3))]" /> Refeições
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
