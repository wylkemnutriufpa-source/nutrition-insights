import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, Droplets, Zap, Calculator } from "lucide-react";

interface Props {
  anamnesis?: any;
  physicalAssessment?: any;
}

export default function PatientCalculators({ anamnesis, physicalAssessment }: Props) {
  // Peso Ideal
  const [piHeight, setPiHeight] = useState(physicalAssessment?.height || anamnesis?.answers?.height || "");
  const [piGender, setPiGender] = useState(anamnesis?.answers?.gender || "male");
  const [piResult, setPiResult] = useState<{ min: number; ideal: number; max: number } | null>(null);

  // Hidratação
  const [waterWeight, setWaterWeight] = useState(physicalAssessment?.weight || anamnesis?.answers?.weight || "");
  const [waterActivity, setWaterActivity] = useState("moderate");
  const [waterResult, setWaterResult] = useState<number | null>(null);

  // Energia (TMB/GET)
  const [enWeight, setEnWeight] = useState(physicalAssessment?.weight || "");
  const [enHeight, setEnHeight] = useState(physicalAssessment?.height || "");
  const [enAge, setEnAge] = useState(anamnesis?.answers?.age || "");
  const [enGender, setEnGender] = useState(anamnesis?.answers?.gender || "male");
  const [enActivity, setEnActivity] = useState("1.55");
  const [enGoal, setEnGoal] = useState("maintain");
  const [enResult, setEnResult] = useState<{ tmb: number; get: number; adjusted: number } | null>(null);

  const calcIdealWeight = () => {
    const h = Number(piHeight);
    if (!h) return;
    // Devine formula
    if (piGender === "male") {
      const ideal = 50 + 2.3 * ((h / 2.54) - 60);
      setPiResult({ min: Math.round(ideal * 0.9), ideal: Math.round(ideal), max: Math.round(ideal * 1.1) });
    } else {
      const ideal = 45.5 + 2.3 * ((h / 2.54) - 60);
      setPiResult({ min: Math.round(ideal * 0.9), ideal: Math.round(ideal), max: Math.round(ideal * 1.1) });
    }
  };

  const calcWater = () => {
    const w = Number(waterWeight);
    if (!w) return;
    let ml = w * 35;
    if (waterActivity === "high") ml = w * 45;
    else if (waterActivity === "moderate") ml = w * 40;
    else ml = w * 35;
    setWaterResult(Math.round(ml));
  };

  const calcEnergy = () => {
    const w = Number(enWeight), h = Number(enHeight), a = Number(enAge), af = Number(enActivity);
    if (!w || !h || !a) return;
    // Mifflin-St Jeor
    let tmb = enGender === "male"
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;
    const get = tmb * af;
    let adjusted = get;
    if (enGoal === "lose") adjusted = get - 500;
    else if (enGoal === "gain") adjusted = get + 400;
    setEnResult({ tmb: Math.round(tmb), get: Math.round(get), adjusted: Math.round(adjusted) });
  };

  return (
    <Tabs defaultValue="weight" className="w-full">
      <TabsList className="w-full grid grid-cols-3 bg-card border border-border">
        <TabsTrigger value="weight" className="gap-1.5"><Scale className="w-3.5 h-3.5" /> Peso Ideal</TabsTrigger>
        <TabsTrigger value="water" className="gap-1.5"><Droplets className="w-3.5 h-3.5" /> Hidratação</TabsTrigger>
        <TabsTrigger value="energy" className="gap-1.5"><Zap className="w-3.5 h-3.5" /> Energia</TabsTrigger>
      </TabsList>

      {/* Peso Ideal */}
      <TabsContent value="weight" className="mt-4">
        <Card className="glass border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" /> Calculadora de Peso Ideal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Fórmula de Devine — referência clínica para faixa de peso saudável.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Altura (cm)</Label>
                <Input type="number" value={piHeight} onChange={e => setPiHeight(e.target.value)} placeholder="170" />
              </div>
              <div>
                <Label>Sexo</Label>
                <Select value={piGender} onValueChange={setPiGender}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={calcIdealWeight} className="w-full gradient-primary gap-2">
              <Calculator className="w-4 h-4" /> Calcular
            </Button>
            {piResult && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-xs text-muted-foreground">Mínimo</p>
                  <p className="text-lg font-bold text-warning">{piResult.min} kg</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-muted-foreground">Ideal</p>
                  <p className="text-lg font-bold text-primary">{piResult.ideal} kg</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-xs text-muted-foreground">Máximo</p>
                  <p className="text-lg font-bold text-warning">{piResult.max} kg</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Hidratação */}
      <TabsContent value="water" className="mt-4">
        <Card className="glass border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Droplets className="w-5 h-5 text-info" /> Calculadora de Hidratação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Recomendação diária de água baseada no peso e nível de atividade.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Peso (kg)</Label>
                <Input type="number" value={waterWeight} onChange={e => setWaterWeight(e.target.value)} placeholder="70" />
              </div>
              <div>
                <Label>Atividade Física</Label>
                <Select value={waterActivity} onValueChange={setWaterActivity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Sedentário</SelectItem>
                    <SelectItem value="moderate">Moderado</SelectItem>
                    <SelectItem value="high">Intenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={calcWater} className="w-full bg-info text-info-foreground hover:bg-info/90 gap-2">
              <Calculator className="w-4 h-4" /> Calcular
            </Button>
            {waterResult && (
              <div className="text-center p-4 rounded-lg bg-info/10 border border-info/20 mt-4">
                <p className="text-xs text-muted-foreground mb-1">Recomendação Diária</p>
                <p className="text-3xl font-bold text-info">{waterResult} ml</p>
                <p className="text-sm text-muted-foreground mt-1">≈ {Math.round(waterResult / 250)} copos de 250ml</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Energia */}
      <TabsContent value="energy" className="mt-4">
        <Card className="glass border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Zap className="w-5 h-5 text-warning" /> Calculadora de Gasto Energético
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Mifflin-St Jeor — TMB e GET com ajuste por objetivo.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Peso (kg)</Label>
                <Input type="number" value={enWeight} onChange={e => setEnWeight(e.target.value)} placeholder="70" />
              </div>
              <div>
                <Label>Altura (cm)</Label>
                <Input type="number" value={enHeight} onChange={e => setEnHeight(e.target.value)} placeholder="170" />
              </div>
              <div>
                <Label>Idade</Label>
                <Input type="number" value={enAge} onChange={e => setEnAge(e.target.value)} placeholder="30" />
              </div>
              <div>
                <Label>Sexo</Label>
                <Select value={enGender} onValueChange={setEnGender}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fator de Atividade</Label>
                <Select value={enActivity} onValueChange={setEnActivity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1.2">Sedentário (1.2)</SelectItem>
                    <SelectItem value="1.375">Leve (1.375)</SelectItem>
                    <SelectItem value="1.55">Moderado (1.55)</SelectItem>
                    <SelectItem value="1.725">Intenso (1.725)</SelectItem>
                    <SelectItem value="1.9">Muito Intenso (1.9)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Objetivo</Label>
                <Select value={enGoal} onValueChange={setEnGoal}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lose">Perder peso (-500 kcal)</SelectItem>
                    <SelectItem value="maintain">Manter</SelectItem>
                    <SelectItem value="gain">Ganhar massa (+400 kcal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={calcEnergy} className="w-full bg-warning text-warning-foreground hover:bg-warning/90 gap-2">
              <Calculator className="w-4 h-4" /> Calcular
            </Button>
            {enResult && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center p-3 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-muted-foreground">TMB</p>
                  <p className="text-lg font-bold">{enResult.tmb} kcal</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-muted-foreground">GET</p>
                  <p className="text-lg font-bold">{enResult.get} kcal</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-muted-foreground">Meta Ajustada</p>
                  <p className="text-lg font-bold text-primary">{enResult.adjusted} kcal</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
