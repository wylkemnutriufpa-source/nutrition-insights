import { useState, useEffect, useCallback } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { toast } from "sonner";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Input } from "@v1/components/ui/input";
import { Textarea } from "@v1/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import {
  Upload, FileText, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Search, Plus, Eye, Trash2, Activity, Loader2
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { extractLabMarkersFromText, interpretLabResults } from "@v1/lib/labResultsInterpreter";
import type { LabFlag, LabInterpretationResult } from "@v1/lib/labResultsInterpreter";

interface Props {
  patientId: string;
  patientGender?: "male" | "female";
}

interface LabResult {
  id: string;
  exam_date: string;
  source_file_name: string | null;
  source_file_url: string | null;
  raw_text: string | null;
  structured_json: Record<string, number> | null;
  interpreted_flags_json: LabFlag[] | null;
  status: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}

const MARKER_LABELS: Record<string, string> = {
  vitamin_d: "Vitamina D",
  ferritin: "Ferritina",
  hemoglobin: "Hemoglobina",
  glucose_fasting: "Glicose Jejum",
  hba1c: "HbA1c",
  triglycerides: "Triglicerídeos",
  hdl: "HDL",
  ldl: "LDL",
  total_cholesterol: "Colesterol Total",
  tsh: "TSH",
  t4_free: "T4 Livre",
  creatinine: "Creatinina",
  uric_acid: "Ácido Úrico",
  vitamin_b12: "Vitamina B12",
  folate: "Ácido Fólico",
  iron_serum: "Ferro Sérico",
  calcium: "Cálcio",
  magnesium: "Magnésio",
  alt: "TGP/ALT",
  ast: "TGO/AST",
  ggt: "GGT",
  pcr: "PCR",
  insulin_fasting: "Insulina Jejum",
  cortisol: "Cortisol",
  albumin: "Albumina",
};

const SEVERITY_COLORS: Record<string, string> = {
  critica: "bg-destructive/15 text-destructive border-destructive/30",
  alta: "bg-warning/15 text-warning border-warning/30",
  moderada: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  baixa: "bg-blue-500/15 text-blue-600 border-blue-500/30",
};

export default function PatientLabExams({ patientId, patientGender }: Props) {
  const { user } = useAuth();
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<LabResult | null>(null);
  const [rawText, setRawText] = useState("");
  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);
  const [uploading, setUploading] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchResults = useCallback(async () => {
    const { data } = await supabase
      .from("patient_lab_results")
      .select("*")
      .eq("patient_id", patientId)
      .order("exam_date", { ascending: false })
      .limit(50);
    setResults((data as unknown as LabResult[]) || []);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const handleFileUpload = async (file: File) => {
    if (!user) return null;
    setFileUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `lab-exams/${patientId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("patient-documents").upload(path, file);
      if (error) throw error;
      // Bucket is private — use signed URL
      const { data: signedData } = await supabase.storage.from("patient-documents").createSignedUrl(path, 3600);
      setFileUploading(false);
      return { url: signedData?.signedUrl || path, name: file.name };
    } catch (e: any) {
      toast.error("Erro no upload: " + e.message);
      setFileUploading(false);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!rawText.trim() && !selectedFile) {
      toast.error("Cole o texto do exame ou faça upload do arquivo.");
      return;
    }
    setUploading(true);
    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (selectedFile) {
        const result = await handleFileUpload(selectedFile);
        if (result) {
          fileUrl = result.url;
          fileName = result.name;
        }
      }

      // Extract markers from text
      const structured = rawText.trim() ? extractLabMarkersFromText(rawText) : {};
      const markerCount = Object.keys(structured).length;

      // Interpret results
      const interpretation = await interpretLabResults(structured, patientGender);

      const { error } = await supabase.from("patient_lab_results").insert({
        patient_id: patientId,
        exam_date: examDate,
        raw_text: rawText || null,
        source_file_url: fileUrl,
        source_file_name: fileName,
        structured_json: structured as any,
        interpreted_flags_json: interpretation.flags as any,
        status: markerCount > 0 ? "interpreted" : "pending_review",
      } as any);

      if (error) throw error;

      toast.success(`Exame salvo! ${markerCount} marcadores extraídos, ${interpretation.flags.length} alertas.`);
      setAddOpen(false);
      setRawText("");
      setSelectedFile(null);
      setExamDate(new Date().toISOString().split("T")[0]);
      fetchResults();
    } catch (e: any) {
      toast.error("Erro ao salvar exame: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("patient_lab_results").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Exame removido."); fetchResults(); }
  };

  // Build evolution data for charts
  const evolutionData = results
    .slice()
    .reverse()
    .map((r) => {
      const entry: Record<string, any> = {
        date: new Date(r.exam_date).toLocaleDateString("pt-BR"),
      };
      if (r.structured_json) {
        for (const [k, v] of Object.entries(r.structured_json)) {
          entry[k] = v;
        }
      }
      return entry;
    });

  // Get all unique markers across results
  const allMarkers = Array.from(
    new Set(results.flatMap((r) => (r.structured_json ? Object.keys(r.structured_json) : [])))
  );

  // Latest result for current markers panel
  const latest = results[0];
  const latestFlags = (latest?.interpreted_flags_json || []) as LabFlag[];

  const CHART_COLORS = [
    "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--warning))",
    "hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--info))",
  ];

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Carregando exames...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Exames Laboratoriais
          </h3>
          <p className="text-sm text-muted-foreground">{results.length} exame(s) registrado(s)</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Exame
        </Button>
      </div>

      <Tabs defaultValue="markers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="markers" className="gap-1.5"><Search className="w-4 h-4" /> Marcadores Atuais</TabsTrigger>
          <TabsTrigger value="evolution" className="gap-1.5"><TrendingUp className="w-4 h-4" /> Evolução</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><FileText className="w-4 h-4" /> Histórico</TabsTrigger>
        </TabsList>

        {/* Current Markers Panel */}
        <TabsContent value="markers">
          {!latest ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum exame registrado ainda.</p>
              <Button variant="outline" className="mt-3" onClick={() => setAddOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar Primeiro Exame
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Alerts */}
              {latestFlags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" /> Alertas ({latestFlags.length})
                  </h4>
                  <div className="grid gap-2">
                    {latestFlags.map((f, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${SEVERITY_COLORS[f.severity] || SEVERITY_COLORS.baixa}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{f.marker_name}: {f.marker_value}</span>
                          <Badge variant="outline" className="text-[10px]">{f.severity}</Badge>
                        </div>
                        <p className="text-xs mt-1 opacity-80">{f.clinical_note}</p>
                        {f.suggested_strategy && (
                          <p className="text-xs mt-1 italic">💡 {f.suggested_strategy}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Markers grid */}
              {latest.structured_json && Object.keys(latest.structured_json).length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Marcadores — {new Date(latest.exam_date).toLocaleDateString("pt-BR")}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {Object.entries(latest.structured_json).map(([key, val]) => {
                      const flag = latestFlags.find((f) => f.marker_key === key);
                      const isAlert = !!flag;
                      return (
                        <div
                          key={key}
                          className={`p-3 rounded-lg border ${isAlert ? "border-warning/40 bg-warning/5" : "border-border bg-card"}`}
                        >
                          <p className="text-[11px] text-muted-foreground">{MARKER_LABELS[key] || key}</p>
                          <p className={`text-lg font-bold ${isAlert ? "text-warning" : "text-foreground"}`}>
                            {val as number}
                          </p>
                          {isAlert && (
                            <p className="text-[10px] text-warning mt-0.5">⚠️ {flag.severity}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum marcador extraído do último exame.</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* Evolution Charts */}
        <TabsContent value="evolution">
          {evolutionData.length < 2 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Necessários pelo menos 2 exames para gráfico de evolução.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group markers by category */}
              {[
                { label: "Perfil Lipídico", keys: ["total_cholesterol", "hdl", "ldl", "triglycerides"] },
                { label: "Glicemia", keys: ["glucose_fasting", "hba1c", "insulin_fasting"] },
                { label: "Tireoide", keys: ["tsh", "t4_free"] },
                { label: "Vitaminas & Minerais", keys: ["vitamin_d", "vitamin_b12", "folate", "iron_serum", "ferritin", "calcium", "magnesium"] },
                { label: "Função Hepática", keys: ["alt", "ast", "ggt", "albumin"] },
                { label: "Outros", keys: ["hemoglobin", "creatinine", "uric_acid", "pcr", "cortisol"] },
              ]
                .filter((g) => g.keys.some((k) => allMarkers.includes(k)))
                .map((group) => {
                  const activeKeys = group.keys.filter((k) => allMarkers.includes(k));
                  return (
                    <div key={group.label} className="p-4 rounded-xl border border-border bg-card">
                      <h4 className="text-sm font-semibold mb-3">{group.label}</h4>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={evolutionData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          {activeKeys.map((k, i) => (
                            <Line
                              key={k}
                              type="monotone"
                              dataKey={k}
                              name={MARKER_LABELS[k] || k}
                              stroke={CHART_COLORS[i % CHART_COLORS.length]}
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              connectNulls
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
            </div>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          {results.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum exame registrado.</p>
          ) : (
            <div className="space-y-2">
              {results.map((r) => {
                const flags = (r.interpreted_flags_json || []) as LabFlag[];
                const markerCount = r.structured_json ? Object.keys(r.structured_json).length : 0;
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-all">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {flags.length > 0 ? (
                        <AlertTriangle className="w-4 h-4 text-warning" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {new Date(r.exam_date).toLocaleDateString("pt-BR")}
                        {r.source_file_name && <span className="text-muted-foreground ml-2">— {r.source_file_name}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {markerCount} marcadores • {flags.length} alerta(s)
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{r.status || "pending"}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => setDetailOpen(r)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Exam Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Plus className="w-5 h-5" /> Registrar Exame Laboratorial
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Data do Exame</label>
              <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Upload do Arquivo (PDF/Imagem)</label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              {selectedFile && <p className="text-xs text-muted-foreground mt-1">📎 {selectedFile.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Texto do Exame (cole os resultados aqui)</label>
              <Textarea
                rows={8}
                placeholder="Cole aqui o texto do exame. Ex:&#10;Glicose: 95 mg/dL&#10;Hemoglobina: 14.2 g/dL&#10;Colesterol Total: 185 mg/dL&#10;HDL: 55 mg/dL&#10;LDL: 110 mg/dL&#10;Triglicerídeos: 120 mg/dL&#10;TSH: 2.5 mUI/L&#10;Vitamina D: 32 ng/mL"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                O sistema extrai automaticamente marcadores como Glicose, Colesterol, TSH, Vitamina D, Ferritina e mais 20+ marcadores.
              </p>
            </div>
            <Button onClick={handleSubmit} disabled={uploading} className="w-full gap-2">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Processando..." : "Salvar e Interpretar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailOpen} onOpenChange={(v) => !v && setDetailOpen(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              Exame — {detailOpen && new Date(detailOpen.exam_date).toLocaleDateString("pt-BR")}
            </DialogTitle>
          </DialogHeader>
          {detailOpen && (
            <div className="space-y-4">
              {detailOpen.source_file_url && (
                <a href={detailOpen.source_file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline flex items-center gap-1">
                  <FileText className="w-4 h-4" /> {detailOpen.source_file_name || "Ver arquivo"}
                </a>
              )}

              {/* Markers */}
              {detailOpen.structured_json && Object.keys(detailOpen.structured_json).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Marcadores Extraídos</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(detailOpen.structured_json).map(([k, v]) => (
                      <div key={k} className="p-2 rounded-lg border border-border bg-muted/30">
                        <p className="text-[10px] text-muted-foreground">{MARKER_LABELS[k] || k}</p>
                        <p className="text-base font-bold">{v as number}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flags */}
              {detailOpen.interpreted_flags_json && (detailOpen.interpreted_flags_json as LabFlag[]).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-warning">⚠️ Alterações Encontradas</h4>
                  <div className="space-y-2">
                    {(detailOpen.interpreted_flags_json as LabFlag[]).map((f, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${SEVERITY_COLORS[f.severity] || SEVERITY_COLORS.baixa}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{f.marker_name}: {f.marker_value}</span>
                          <Badge variant="outline" className="text-[10px]">{f.severity}</Badge>
                        </div>
                        <p className="text-xs mt-1">{f.clinical_note}</p>
                        {f.suggested_strategy && <p className="text-xs mt-1 italic">💡 {f.suggested_strategy}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw text */}
              {detailOpen.raw_text && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Texto Original</h4>
                  <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-48">
                    {detailOpen.raw_text}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
