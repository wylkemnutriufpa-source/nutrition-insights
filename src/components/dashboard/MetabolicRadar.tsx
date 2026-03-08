import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

interface MetabolicRadarProps {
  anamnesis: {
    answers: any;
    computed_tmb: number | null;
    computed_kcal_target: number | null;
    computed_protein: number | null;
    computed_carbs: number | null;
    computed_fat: number | null;
  } | null;
}

export default function MetabolicRadar({ anamnesis }: MetabolicRadarProps) {
  if (!anamnesis?.answers) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-muted-foreground text-sm">Anamnese não preenchida para gerar radar.</p>
      </div>
    );
  }

  const a = anamnesis.answers;

  // Compute radar dimensions (0-100 scale)
  const activityScore: Record<string, number> = { sedentary: 20, light: 40, moderate: 70, intense: 95 };
  const hydrationScore = Math.min(100, ((a.water_intake || 4) / 12) * 100);
  const sleepScore = (() => {
    if (!a.wake_time || !a.sleep_time) return 50;
    const [wh, wm] = a.wake_time.split(":").map(Number);
    const [sh, sm] = a.sleep_time.split(":").map(Number);
    let hours = wh - sh;
    if (hours <= 0) hours += 24;
    if (hours >= 7 && hours <= 9) return 90;
    if (hours >= 6 && hours <= 10) return 60;
    return 30;
  })();

  const nutritionScore = (() => {
    const restrictions = a.restrictions || [];
    const conditions = a.health_conditions || [];
    let score = 70;
    if (restrictions.includes("none") && conditions.includes("none")) score = 90;
    if (conditions.some((c: string) => c !== "none")) score -= 20;
    return Math.max(10, Math.min(100, score));
  })();

  const motivationScore: Record<string, number> = {
    terrible: 15, bad: 30, ok: 50, good: 75, great: 95,
  };

  const exerciseTypes = a.exercise_type || [];
  const exerciseVariety = exerciseTypes.includes("none") ? 10 : Math.min(100, exerciseTypes.length * 30);

  const data = [
    { metric: "Atividade", value: activityScore[a.activity_level] || 40 },
    { metric: "Hidratação", value: Math.round(hydrationScore) },
    { metric: "Sono", value: sleepScore },
    { metric: "Nutrição", value: nutritionScore },
    { metric: "Motivação", value: motivationScore[a.feeling] || 50 },
    { metric: "Exercícios", value: exerciseVariety },
  ];

  const overallScore = Math.round(data.reduce((s, d) => s + d.value, 0) / data.length);

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Radar Metabólico</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-bold ${
          overallScore >= 70 ? "bg-success/10 text-success" :
          overallScore >= 40 ? "bg-warning/10 text-warning" :
          "bg-destructive/10 text-destructive"
        }`}>
          Score: {overallScore}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Paciente"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Metric details */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {data.map((d) => (
          <div key={d.metric} className="text-center p-2 rounded-lg bg-card">
            <p className="text-xs text-muted-foreground">{d.metric}</p>
            <p className={`font-bold text-sm ${
              d.value >= 70 ? "text-success" : d.value >= 40 ? "text-warning" : "text-destructive"
            }`}>
              {d.value}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
