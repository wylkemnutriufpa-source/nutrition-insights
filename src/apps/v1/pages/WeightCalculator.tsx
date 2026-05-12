import { useState, useEffect } from "react";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent } from "@v1/components/ui/card";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Button } from "@v1/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Scale, Calculator } from "lucide-react";
import { usePatientMetrics } from "@v1/hooks/usePatientMetrics";
import { Badge } from "@v1/components/ui/badge";

interface WeightResult {
  method: string;
  min: number;
  max: number;
  ideal: number;
}

export default function WeightCalculator() {
  const { weight: currentWeight, height: savedHeight, gender: savedGender, source, loading: metricsLoading } = usePatientMetrics();
  const [gender, setGender] = useState<"male" | "female">("male");
  const [height, setHeight] = useState("");
  const [results, setResults] = useState<WeightResult[]>([]);

  // Auto-fill from patient data
  useEffect(() => {
    if (metricsLoading) return;
    if (savedGender) setGender(savedGender);
    if (savedHeight) setHeight(String(Math.round(savedHeight)));
  }, [metricsLoading, savedGender, savedHeight]);

  const calculate = () => {
    const h = parseFloat(height);
    if (!h || h < 100 || h > 250) return;
    const hm = h / 100;
    const res: WeightResult[] = [];

    res.push({
      method: "Faixa IMC (OMS)",
      min: Math.round(18.5 * hm * hm * 10) / 10,
      max: Math.round(24.9 * hm * hm * 10) / 10,
      ideal: Math.round(22 * hm * hm * 10) / 10,
    });

    if (gender === "male") {
      const ideal = h - 100 - ((h - 150) / 4);
      res.push({ method: "Fórmula de Lorentz", min: Math.round((ideal - 5) * 10) / 10, max: Math.round((ideal + 5) * 10) / 10, ideal: Math.round(ideal * 10) / 10 });
    } else {
      const ideal = h - 100 - ((h - 150) / 2.5);
      res.push({ method: "Fórmula de Lorentz", min: Math.round((ideal - 5) * 10) / 10, max: Math.round((ideal + 5) * 10) / 10, ideal: Math.round(ideal * 10) / 10 });
    }

    if (gender === "male") {
      const ideal = 48 + 2.7 * ((h - 152.4) / 2.54);
      res.push({ method: "Fórmula de Hamwi", min: Math.round((ideal * 0.9) * 10) / 10, max: Math.round((ideal * 1.1) * 10) / 10, ideal: Math.round(ideal * 10) / 10 });
    } else {
      const ideal = 45.5 + 2.2 * ((h - 152.4) / 2.54);
      res.push({ method: "Fórmula de Hamwi", min: Math.round((ideal * 0.9) * 10) / 10, max: Math.round((ideal * 1.1) * 10) / 10, ideal: Math.round(ideal * 10) / 10 });
    }

    setResults(res);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Scale className="w-8 h-8 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-bold">Calculadora de Peso Ideal</h1>
            <p className="text-muted-foreground text-sm">Calcule o peso ideal usando diferentes métodos</p>
          </div>
        </div>

        <Card className="glass shadow-card">
          <CardContent className="py-6 space-y-4">
            {/* Auto-fill indicator */}
            {currentWeight && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Auto</Badge>
                <p className="text-xs text-muted-foreground">
                  Peso atual: <span className="font-semibold text-foreground">{currentWeight} kg</span>
                  {source && <span className="text-muted-foreground/60"> (via {source})</span>}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sexo</Label>
                <Select value={gender} onValueChange={v => setGender(v as "male" | "female")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Altura (cm)</Label>
                <Input type="number" min={100} max={250} value={height} onChange={e => setHeight(e.target.value)} placeholder="170" />
              </div>
            </div>
            <Button onClick={calculate} className="w-full gradient-primary shadow-glow" disabled={!height}>
              <Calculator className="w-4 h-4 mr-2" /> Calcular
            </Button>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((r, i) => (
              <Card key={i} className="glass shadow-card">
                <CardContent className="py-4">
                  <p className="text-xs text-muted-foreground mb-2">{r.method}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Faixa</p>
                      <p className="font-display font-semibold">{r.min} – {r.max} kg</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Ideal</p>
                      <p className="font-display font-bold text-xl text-primary">{r.ideal} kg</p>
                    </div>
                  </div>
                  {/* Show comparison with current weight */}
                  {currentWeight && (
                    <div className="mt-2 pt-2 border-t border-border/40">
                      <p className="text-xs text-muted-foreground">
                        Seu peso atual ({currentWeight} kg):{" "}
                        {currentWeight < r.min ? (
                          <span className="text-amber-500 font-medium">abaixo da faixa ({(r.min - currentWeight).toFixed(1)} kg)</span>
                        ) : currentWeight > r.max ? (
                          <span className="text-amber-500 font-medium">acima da faixa (+{(currentWeight - r.max).toFixed(1)} kg)</span>
                        ) : (
                          <span className="text-emerald-500 font-medium">dentro da faixa ideal ✓</span>
                        )}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
