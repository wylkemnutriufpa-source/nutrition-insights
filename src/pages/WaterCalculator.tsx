import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Droplets, Calculator, GlassWater } from "lucide-react";
import { usePatientMetrics } from "@/hooks/usePatientMetrics";
import { Badge } from "@/components/ui/badge";

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentário", factor: 30 },
  { value: "light", label: "Leve (1-2x/semana)", factor: 35 },
  { value: "moderate", label: "Moderado (3-5x/semana)", factor: 40 },
  { value: "intense", label: "Intenso (6-7x/semana)", factor: 45 },
  { value: "athlete", label: "Atleta", factor: 50 },
];

export default function WaterCalculator() {
  const { weight: savedWeight, source, loading: metricsLoading } = usePatientMetrics();
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState("moderate");
  const [result, setResult] = useState<{ ml: number; glasses: number; liters: string } | null>(null);

  // Auto-fill weight from patient data
  useEffect(() => {
    if (metricsLoading) return;
    if (savedWeight) setWeight(String(savedWeight));
  }, [metricsLoading, savedWeight]);

  const calculate = () => {
    const w = parseFloat(weight);
    if (!w || w < 20 || w > 300) return;
    const factor = ACTIVITY_LEVELS.find(a => a.value === activity)?.factor || 35;
    const ml = Math.round(w * factor);
    setResult({ ml, glasses: Math.ceil(ml / 250), liters: (ml / 1000).toFixed(1) });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Droplets className="w-8 h-8 text-info" />
          <div>
            <h1 className="font-display text-2xl font-bold">Calculadora de Hidratação</h1>
            <p className="text-muted-foreground text-sm">Calcule sua ingestão diária de água recomendada</p>
          </div>
        </div>

        <Card className="glass shadow-card">
          <CardContent className="py-6 space-y-4">
            {/* Auto-fill indicator */}
            {savedWeight && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-info/5 border border-info/20">
                <Badge variant="outline" className="text-[10px] border-info/30 text-info">Auto</Badge>
                <p className="text-xs text-muted-foreground">
                  Peso carregado: <span className="font-semibold text-foreground">{savedWeight} kg</span>
                  {source && <span className="text-muted-foreground/60"> (via {source})</span>}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Peso (kg)</Label>
                <Input type="number" min={20} max={300} value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" />
              </div>
              <div>
                <Label>Nível de atividade</Label>
                <Select value={activity} onValueChange={setActivity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_LEVELS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={calculate} className="w-full gradient-primary shadow-glow" disabled={!weight}>
              <Calculator className="w-4 h-4 mr-2" /> Calcular
            </Button>
          </CardContent>
        </Card>

        {result && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="glass shadow-card">
              <CardContent className="py-6 text-center">
                <Droplets className="w-8 h-8 mx-auto text-info mb-2" />
                <p className="font-display font-bold text-2xl text-info">{result.ml}</p>
                <p className="text-xs text-muted-foreground">mL por dia</p>
              </CardContent>
            </Card>
            <Card className="glass shadow-card">
              <CardContent className="py-6 text-center">
                <GlassWater className="w-8 h-8 mx-auto text-primary mb-2" />
                <p className="font-display font-bold text-2xl text-primary">{result.liters}L</p>
                <p className="text-xs text-muted-foreground">litros por dia</p>
              </CardContent>
            </Card>
            <Card className="glass shadow-card">
              <CardContent className="py-6 text-center">
                <GlassWater className="w-8 h-8 mx-auto text-accent mb-2" />
                <p className="font-display font-bold text-2xl text-accent">{result.glasses}</p>
                <p className="text-xs text-muted-foreground">copos (250mL)</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
