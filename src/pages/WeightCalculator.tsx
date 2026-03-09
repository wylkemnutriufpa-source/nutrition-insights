import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, Calculator, TrendingUp } from "lucide-react";

interface WeightResult {
  method: string;
  min: number;
  max: number;
  ideal: number;
}

export default function WeightCalculator() {
  const [gender, setGender] = useState<"male" | "female">("male");
  const [height, setHeight] = useState("");
  const [results, setResults] = useState<WeightResult[]>([]);

  const calculate = () => {
    const h = parseFloat(height);
    if (!h || h < 100 || h > 250) return;

    const hm = h / 100;
    const res: WeightResult[] = [];

    // IMC range (18.5-24.9)
    res.push({
      method: "Faixa IMC (OMS)",
      min: Math.round(18.5 * hm * hm * 10) / 10,
      max: Math.round(24.9 * hm * hm * 10) / 10,
      ideal: Math.round(22 * hm * hm * 10) / 10,
    });

    // Lorentz
    if (gender === "male") {
      const ideal = h - 100 - ((h - 150) / 4);
      res.push({ method: "Fórmula de Lorentz", min: Math.round((ideal - 5) * 10) / 10, max: Math.round((ideal + 5) * 10) / 10, ideal: Math.round(ideal * 10) / 10 });
    } else {
      const ideal = h - 100 - ((h - 150) / 2.5);
      res.push({ method: "Fórmula de Lorentz", min: Math.round((ideal - 5) * 10) / 10, max: Math.round((ideal + 5) * 10) / 10, ideal: Math.round(ideal * 10) / 10 });
    }

    // Hamwi
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
