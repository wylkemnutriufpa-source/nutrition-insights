import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import { toast } from "sonner";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Input } from "@v1/components/ui/input";
import { Textarea } from "@v1/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import {
  ArrowLeft, FlaskConical, Activity, AlertTriangle, CheckCircle2,
  Search, Loader2, Crown, Users, Sparkles, FileText, Beaker
} from "lucide-react";
import { extractLabMarkersFromText, interpretLabResults } from "@v1/lib/labResultsInterpreter";
import type { LabFlag, LabInterpretationResult } from "@v1/lib/labResultsInterpreter";

const MARKER_LABELS: Record<string, string> = {
  vitamin_d: "Vitamina D", ferritin: "Ferritina", hemoglobin: "Hemoglobina",
  glucose_fasting: "Glicose Jejum", hba1c: "HbA1c", triglycerides: "Triglicerídeos",
  hdl: "HDL", ldl: "LDL", total_cholesterol: "Colesterol Total",
  tsh: "TSH", t4_free: "T4 Livre", creatinine: "Creatinina",
  uric_acid: "Ácido Úrico", vitamin_b12: "Vitamina B12", folate: "Ácido Fólico",
  iron_serum: "Ferro Sérico", calcium: "Cálcio", magnesium: "Magnésio",
  alt: "TGP/ALT", ast: "TGO/AST", ggt: "GGT", pcr: "PCR",
  insulin_fasting: "Insulina Jejum", cortisol: "Cortisol", albumin: "Albumina",
};

const SEVERITY_COLORS: Record<string, string> = {
  critica: "bg-destructive/15 text-destructive border-destructive/30",
  alta: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  moderada: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  baixa: "bg-blue-500/15 text-blue-600 border-blue-500/30",
};

const RISK_COLORS: Record<string, string> = {
  normal: "text-emerald-500",
  moderado: "text-amber-500",
  alto: "text-orange-500",
  critico: "text-destructive",
};

const RISK_LABELS: Record<string, string> = {
  normal: "✅ Normal", moderado: "⚠️ Moderado", alto: "🔶 Alto", critico: "🔴 Crítico",
};

export default function LabInterpreter() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rawText, setRawText] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [interpreting, setInterpreting] = useState(false);
  const [result, setResult] = useState<LabInterpretationResult | null>(null);
  const [markers, setMarkers] = useState<Record<string, number>>({});

  // Patient link mode
  const [linkMode, setLinkMode] = useState(false);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [patientsLoaded, setPatientsLoaded] = useState(false);

  const loadPatients = useCallback(async () => {
    if (patientsLoaded || !user) return;
    const { data } = await supabase
      .from("nutritionist_patients")
      .select("patient_id, patients:patient_id(id, name)")
      .eq("nutritionist_id", user.id);
    
    const list = (data || [])
      .map((d: any) => d.patients)
      .filter(Boolean)
      .map((p: any) => ({ id: p.id, name: p.name }));
    setPatients(list);
    setPatientsLoaded(true);
  }, [user, patientsLoaded]);

  const handleInterpret = async () => {
    if (!rawText.trim()) {
      toast.error("Cole o texto do exame para interpretar.");
      return;
    }
    setInterpreting(true);
    try {
      const structured = extractLabMarkersFromText(rawText);
      const markerCount = Object.keys(structured).length;

      if (markerCount === 0) {
        toast.error("Nenhum marcador bioquímico reconhecido. Verifique o formato do texto.");
        setInterpreting(false);
        return;
      }

      const interpretation = await interpretLabResults(
        structured,
        gender === "" ? undefined : gender
      );

      setMarkers(structured);
      setResult(interpretation);
      toast.success(`${markerCount} marcadores extraídos, ${interpretation.flags.length} alertas encontrados.`);
    } catch (e: any) {
      toast.error("Erro na interpretação: " + e.message);
    } finally {
      setInterpreting(false);
    }
  };

  const handleSaveToPatient = async () => {
    if (!selectedPatient) {
      toast.error("Selecione um paciente para salvar.");
      return;
    }
    try {
      const { error } = await supabase.from("patient_lab_results").insert({
        patient_id: selectedPatient,
        exam_date: new Date().toISOString().split("T")[0],
        raw_text: rawText,
        structured_json: markers as any,
        interpreted_flags_json: (result?.flags || []) as any,
        status: "interpreted",
      } as any);

      if (error) throw error;
      toast.success("Exame salvo no histórico do paciente!");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    }
  };

  const handleClear = () => {
    setRawText("");
    setResult(null);
    setMarkers({});
    setSelectedPatient("");
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-primary" />
              Interpretador de Exames Laboratoriais
              <Badge className="bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-[10px]">
                <Crown className="w-3 h-3 mr-1" /> Premium
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Cole resultados de exames e obtenha interpretação clínica instantânea com 25+ marcadores
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Beaker className="w-4 h-4" /> Dados do Exame
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Sexo do paciente</label>
                <Select value={gender} onValueChange={(v) => setGender(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Cole o texto do exame laboratorial
                </label>
                <Textarea
                  placeholder={`Ex:\nVitamina D: 18 ng/mL\nFerritina: 12 ng/mL\nGlicose: 105 mg/dL\nHemoglobina: 11.2 g/dL\nTSH: 6.8 mUI/L\nColesterol Total: 245 mg/dL\nHDL: 38 mg/dL\nLDL: 165 mg/dL\nTriglicerídeos: 210 mg/dL`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="min-h-[220px] font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleInterpret}
                  disabled={interpreting || !rawText.trim()}
                  className="flex-1 gap-2"
                >
                  {interpreting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {interpreting ? "Interpretando..." : "Interpretar Exame"}
                </Button>
                {result && (
                  <Button variant="outline" onClick={handleClear}>
                    Limpar
                  </Button>
                )}
              </div>

              {/* Link to patient */}
              {result && (
                <div className="border-t pt-3 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 w-full"
                    onClick={() => {
                      setLinkMode(!linkMode);
                      loadPatients();
                    }}
                  >
                    <Users className="w-4 h-4" />
                    {linkMode ? "Fechar vínculo" : "Vincular a um paciente"}
                  </Button>
                  {linkMode && (
                    <div className="space-y-2">
                      <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o paciente" />
                        </SelectTrigger>
                        <SelectContent>
                          <ScrollArea className="max-h-[200px]">
                            {patients.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="w-full gap-2"
                        disabled={!selectedPatient}
                        onClick={handleSaveToPatient}
                      >
                        <FileText className="w-4 h-4" /> Salvar no Histórico do Paciente
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Panel */}
          <div className="space-y-4">
            {!result ? (
              <Card className="border-dashed border-2 border-muted">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <FlaskConical className="w-16 h-16 mb-4 opacity-20" />
                  <p className="font-medium">Resultados aparecerão aqui</p>
                  <p className="text-sm mt-1">Cole o texto do exame e clique em Interpretar</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Risk Summary */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Nível de Risco</p>
                        <p className={`text-2xl font-bold ${RISK_COLORS[result.risk_level]}`}>
                          {RISK_LABELS[result.risk_level]}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Marcadores</p>
                        <p className="text-2xl font-bold">{Object.keys(markers).length}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Alertas</p>
                        <p className="text-2xl font-bold text-warning">{result.flags.length}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{result.summary}</p>
                  </CardContent>
                </Card>

                {/* Flags / Alerts */}
                {result.flags.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        Alertas Clínicos ({result.flags.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {result.flags.map((f, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg border ${SEVERITY_COLORS[f.severity] || SEVERITY_COLORS.baixa}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">
                              {f.marker_name}: {f.marker_value}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {f.severity}
                            </Badge>
                          </div>
                          <p className="text-xs mt-1 opacity-80">{f.clinical_note}</p>
                          {f.suggested_strategy && (
                            <p className="text-xs mt-1 italic">💡 {f.suggested_strategy}</p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* All Markers Grid */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Todos os Marcadores
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(markers).map(([key, val]) => {
                        const flag = result.flags.find((f) => f.marker_key === key);
                        return (
                          <div
                            key={key}
                            className={`p-3 rounded-lg border ${
                              flag ? "border-warning/40 bg-warning/5" : "border-border bg-card"
                            }`}
                          >
                            <p className="text-[11px] text-muted-foreground">
                              {MARKER_LABELS[key] || key}
                            </p>
                            <p className={`text-lg font-bold ${flag ? "text-warning" : "text-foreground"}`}>
                              {val}
                            </p>
                            {flag && (
                              <p className="text-[10px] text-warning mt-0.5">⚠️ {flag.severity}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Normal markers note */}
                {result.flags.length === 0 && (
                  <Card className="border-emerald-500/30 bg-emerald-500/5">
                    <CardContent className="p-4 flex items-center gap-3">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      <div>
                        <p className="font-medium text-emerald-600">Tudo dentro dos parâmetros!</p>
                        <p className="text-sm text-muted-foreground">
                          Nenhuma alteração significativa detectada nos marcadores analisados.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
