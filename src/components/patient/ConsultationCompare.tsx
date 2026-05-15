import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { ArrowUp, ArrowDown, Minus, GitCompare } from "lucide-react";

interface ConsultationCompareProps {
  patientId: string;
}

const FIELDS: { key: string; label: string; unit: string; lowerBetter?: boolean }[] = [
  { key: "weight", label: "Peso", unit: "kg", lowerBetter: true },
  { key: "body_fat_percentage", label: "% Gordura", unit: "%", lowerBetter: true },
  { key: "lean_mass", label: "Massa Magra", unit: "kg" },
  { key: "bmi", label: "IMC", unit: "", lowerBetter: true },
  { key: "waist", label: "Cintura", unit: "cm", lowerBetter: true },
  { key: "abdomen", label: "Abdômen", unit: "cm", lowerBetter: true },
  { key: "hip", label: "Quadril", unit: "cm" },
  { key: "right_arm", label: "Braço D", unit: "cm" },
  { key: "bmr", label: "TMB", unit: "kcal" },
  { key: "tdee", label: "GET", unit: "kcal" },
  { key: "meta_calorias", label: "Meta Cal", unit: "kcal" },
  { key: "meta_proteinas", label: "Meta Ptn", unit: "g" },
];

function DeltaIcon({ delta, lowerBetter }: { delta: number; lowerBetter?: boolean }) {
  const isGood = lowerBetter ? delta < 0 : delta > 0;
  if (Math.abs(delta) < 0.05) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  return isGood
    ? (lowerBetter ? <ArrowDown className="w-3.5 h-3.5 text-success" /> : <ArrowUp className="w-3.5 h-3.5 text-success" />)
    : (lowerBetter ? <ArrowUp className="w-3.5 h-3.5 text-destructive" /> : <ArrowDown className="w-3.5 h-3.5 text-destructive" />);
}

export default function ConsultationCompare({ patientId }: ConsultationCompareProps) {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState(0);
  const [selectedB, setSelectedB] = useState(1);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("physical_assessments" as any)
        .select("*")
        .eq("patient_id", patientId)
        .order("assessment_date", { ascending: false })
        .limit(10);
      setAssessments((data as any[]) || []);
      setLoading(false);
    })();
  }, [patientId]);

  const aData = assessments[selectedA];
  const bData = assessments[selectedB];

  const compareRows = useMemo(() => {
    if (!aData || !bData) return [];
    return FIELDS.map(f => {
      const rawA = aData[f.key];
      const rawB = bData[f.key];
      const numA = rawA !== null && rawA !== undefined ? Number(rawA) : NaN;
      const numB = rawB !== null && rawB !== undefined ? Number(rawB) : NaN;
      const vA = Number.isFinite(numA) ? numA : null;
      const vB = Number.isFinite(numB) ? numB : null;
      const delta = vA !== null && vB !== null ? vA - vB : null;
      return { ...f, vA, vB, delta };
    }).filter(r => r.vA !== null || r.vB !== null);
  }, [aData, bData, selectedA, selectedB]);

  // Radar data — normalize to 0-100 for radar display
  const radarData = useMemo(() => {
    if (!aData || !bData) return [];
    const fields = [
      { key: "weight", label: "Peso", max: 150 },
      { key: "body_fat_percentage", label: "% Gordura", max: 50 },
      { key: "lean_mass", label: "M.Magra", max: 80 },
      { key: "bmi", label: "IMC", max: 45 },
      { key: "waist", label: "Cintura", max: 130 },
    ];
    return fields.map(f => ({
      subject: f.label,
      A: aData[f.key] ? Math.min(100, (+aData[f.key] / f.max) * 100) : 0,
      B: bData[f.key] ? Math.min(100, (+bData[f.key] / f.max) * 100) : 0,
    }));
  }, [aData, bData]);

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (assessments.length < 2) return (
    <div className="glass rounded-xl p-8 text-center">
      <GitCompare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
      <h3 className="font-display font-semibold text-lg mb-2">Comparativo</h3>
      <p className="text-muted-foreground text-sm">É necessário pelo menos 2 avaliações para comparar.</p>
    </div>
  );

  const dateLabel = (a: any) => new Date(a.assessment_date + "T12:00:00").toLocaleDateString("pt-BR");

  return (
    <div className="space-y-6">
      {/* Selector */}
      <div className="glass rounded-xl p-4">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-primary" /> Selecione as avaliações para comparar
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">📅 Avaliação A (mais recente)</p>
            <div className="space-y-1">
              {assessments.map((a, i) => (
                <button key={a.id} onClick={() => setSelectedA(i)}
                  disabled={i === selectedB}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    i === selectedA ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/30" :
                    i === selectedB ? "opacity-30 cursor-not-allowed" : "hover:bg-muted text-muted-foreground"
                  }`}>
                  {dateLabel(a)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">📅 Avaliação B (anterior)</p>
            <div className="space-y-1">
              {assessments.map((a, i) => (
                <button key={a.id} onClick={() => setSelectedB(i)}
                  disabled={i === selectedA}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    i === selectedB ? "bg-accent/10 text-accent-foreground font-semibold ring-1 ring-accent/30" :
                    i === selectedA ? "opacity-30 cursor-not-allowed" : "hover:bg-muted text-muted-foreground"
                  }`}>
                  {dateLabel(a)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {aData && bData && (
        <>
          {/* Radar comparison */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-display font-semibold text-sm mb-4">Radar Comparativo</h3>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <Radar name={dateLabel(aData)} dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                <Radar name={dateLabel(bData)} dataKey="B" stroke="#f97316" fill="#f97316" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-primary inline-block" /> {dateLabel(aData)}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-orange-400 inline-block" /> {dateLabel(bData)}</span>
            </div>
          </div>

          {/* Comparison table */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="grid grid-cols-4 bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground">
              <span>Indicador</span>
              <span className="text-right text-primary">{dateLabel(aData)}</span>
              <span className="text-right text-orange-400">{dateLabel(bData)}</span>
              <span className="text-right">Δ Variação</span>
            </div>
            {compareRows.map((row, i) => (
              <motion.div
                key={row.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-4 px-4 py-3 border-b border-border/50 hover:bg-muted/20 transition-colors text-sm"
              >
                <span className="font-medium text-foreground">{row.label}</span>
                <span className="text-right font-semibold text-primary">
                  {row.vA !== null ? `${row.vA.toFixed(1)}${row.unit}` : "—"}
                </span>
                <span className="text-right font-semibold text-orange-400">
                  {row.vB !== null ? `${row.vB.toFixed(1)}${row.unit}` : "—"}
                </span>
                <div className="flex items-center justify-end gap-1">
                  {row.delta !== null ? (
                    <>
                      <DeltaIcon delta={row.delta} lowerBetter={row.lowerBetter} />
                      <span className={`font-semibold text-xs ${
                        Math.abs(row.delta) < 0.05 ? "text-muted-foreground" :
                        (row.lowerBetter ? row.delta < 0 : row.delta > 0) ? "text-success" : "text-destructive"
                      }`}>
                        {row.delta >= 0 ? "+" : ""}{row.delta.toFixed(1)}{row.unit}
                      </span>
                    </>
                  ) : <span className="text-muted-foreground">—</span>}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bar comparison for key metrics */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-display font-semibold text-sm mb-4">Composição Corporal — Comparativo</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { name: "Peso (kg)", A: aData.weight ? +aData.weight : 0, B: bData.weight ? +bData.weight : 0 },
                { name: "M.Magra (kg)", A: aData.lean_mass ? +aData.lean_mass : 0, B: bData.lean_mass ? +bData.lean_mass : 0 },
                { name: "M.Gorda (kg)", A: aData.fat_mass ? +aData.fat_mass : 0, B: bData.fat_mass ? +bData.fat_mass : 0 },
              ]} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="kg" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="A" name={dateLabel(aData)} fill="hsl(var(--primary))" opacity={0.85} radius={[4, 4, 0, 0]} />
                <Bar dataKey="B" name={dateLabel(bData)} fill="#f97316" opacity={0.7} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
