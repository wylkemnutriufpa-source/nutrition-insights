import { useEffect, useState } from "react";
import StorageImage from "@/components/common/StorageImage";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter, getTenantIdForInsert } from "@/lib/tenantQueryHelpers";
import { uploadFile } from "@/lib/upload";
import { useFormDraft } from "@/hooks/useFormDraft";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Camera, Upload, Sparkles, ArrowLeft, Calendar, TrendingUp,
  User as UserIcon, Activity
} from "lucide-react";
import { useAIUsage } from "@/hooks/useAIUsage";
import AIUsageBadge from "@/components/common/AIUsageBadge";

interface BodyAnalysisRecord {
  id: string;
  patient_id: string;
  front_image_url: string | null;
  side_image_url: string | null;
  back_image_url: string | null;
  ai_analysis: any;
  body_fat_estimate: number | null;
  muscle_definition: number | null;
  body_type: string | null;
  fat_distribution: any;
  progress_comparison: any;
  notes: string | null;
  analysis_date: string;
  created_at: string;
}

export default function BodyAnalysis() {
  const { user, isNutritionist } = useAuth();
  const { tenantId } = useTenant();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patientId = searchParams.get("patientId") || user?.id;
  const aiUsage = useAIUsage("body_comparison");

  const [analyses, setAnalyses] = useState<BodyAnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<BodyAnalysisRecord | null>(null);
  const [notes, setNotes] = useState("");
  const { saveDraft, loadDraft, clearDraft, hasDraft } = useFormDraft<{ notes: string }>(
    `body_analysis_${patientId}`
  );

  // Restore draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft?.notes) {
      setNotes(draft.notes);
      toast.info("Rascunho de notas restaurado 📝");
    }
  }, [loadDraft]);

  // Auto-save notes draft
  useEffect(() => {
    if (notes) saveDraft({ notes });
  }, [notes, saveDraft]);

  // Image files
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  const fetchAnalyses = async () => {
    if (!patientId) return;
    const q = supabase.from("body_analyses")
      .select("*").eq("patient_id", patientId)
      .order("analysis_date", { ascending: false });
    const { data } = await withTenantFilter(q, tenantId);
    setAnalyses(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAnalyses(); }, [patientId]);

  const uploadImage = async (file: File, path: string): Promise<string | null> => {
    return uploadFile({
      bucket: "body-images",
      path,
      file,
      returnPath: true,
    });
  };


  const handleSubmit = async () => {
    if (!user || !patientId) return;
    if (!frontFile && !sideFile && !backFile) {
      toast.error("Selecione pelo menos uma foto.");
      return;
    }
    if (!aiUsage.allowed) {
      toast.error(aiUsage.nextAvailableLabel || "Limite de análises corporais atingido");
      return;
    }

    setUploading(true);
    const [frontUrl, sideUrl, backUrl] = await Promise.all([
      frontFile ? uploadImage(frontFile, `body/${patientId}/front`) : null,
      sideFile ? uploadImage(sideFile, `body/${patientId}/side`) : null,
      backFile ? uploadImage(backFile, `body/${patientId}/back`) : null,
    ]);
    setUploading(false);

    // Save record
    const { data: record, error } = await supabase.from("body_analyses").insert({
      patient_id: patientId,
      assessor_id: user.id,
      front_image_url: frontUrl,
      side_image_url: sideUrl,
      back_image_url: backUrl,
      notes: notes || null,
      ...getTenantIdForInsert(tenantId),
    }).select().single();

    if (error) { toast.error(error.message); return; }

    toast.success("Fotos salvas! Iniciando análise IA...");
    clearDraft();
    setNewDialogOpen(false);
    setAnalyzing(true);

    // Trigger AI analysis
    try {
      const { data: aiData, error: aiError } = await supabase.functions.invoke("analyze-body", {
        body: {
          analysis_id: record.id,
          front_image_url: frontUrl,
          side_image_url: sideUrl,
          back_image_url: backUrl,
          previous_analysis: analyses[0] || null,
        },
      });

      if (aiError) throw aiError;
      toast.success("Análise corporal concluída! 🎉");
      await aiUsage.recordUsage();
    } catch (e: any) {
      toast.error("Fotos salvas, mas análise IA falhou: " + (e.message || "Tente novamente"));
    }

    setAnalyzing(false);
    setFrontFile(null); setSideFile(null); setBackFile(null); setNotes("");
    fetchAnalyses();
  };

  const PhotoUploadBox = ({ label, file, setFile }: { label: string; file: File | null; setFile: (f: File | null) => void }) => (
    <div className="text-center">
      <Label className="text-xs">{label}</Label>
      <label className="mt-1 block cursor-pointer">
        <div className={`w-full aspect-[3/4] rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-colors ${
          file ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        }`}>
          {file ? (
            <img src={URL.createObjectURL(file)} className="w-full h-full object-cover rounded-lg" alt={label} />
          ) : (
            <>
              <Camera className="w-8 h-8 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Selecionar</span>
            </>
          )}
        </div>
        <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
      </label>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {isNutritionist && (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
            )}
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                <Activity className="w-6 h-6 text-primary" /> Análise Corporal
              </h1>
              <p className="text-sm text-muted-foreground">{analyses.length} análise{analyses.length !== 1 ? "s" : ""} registrada{analyses.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AIUsageBadge status={aiUsage} />
            <Button onClick={() => setNewDialogOpen(true)} disabled={!aiUsage.allowed} className="gradient-primary gap-2">
              <Camera className="w-4 h-4" /> Nova Análise
            </Button>
          </div>
        </div>

        {analyzing && (
          <Card className="glass border-primary/20">
            <CardContent className="py-8 text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 mx-auto border-3 border-primary border-t-transparent rounded-full" />
              <p className="mt-4 font-medium">Analisando imagens com IA...</p>
              <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
            </CardContent>
          </Card>
        )}

        {/* History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analyses.map((a, idx) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass border-border hover:border-primary/30 transition-colors cursor-pointer" onClick={() => { setSelected(a); setDetailOpen(true); }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{new Date(a.analysis_date).toLocaleDateString("pt-BR")}</span>
                      {idx === 0 && <Badge className="text-[10px] bg-primary/10 text-primary">Mais Recente</Badge>}
                    </div>
                    {a.body_fat_estimate && <Badge variant="outline">{a.body_fat_estimate}% BF</Badge>}
                  </div>

                  {/* Thumbnails */}
                  <div className="grid grid-cols-3 gap-2">
                    {[a.front_image_url, a.side_image_url, a.back_image_url].map((url, i) => (
                      <div key={i} className="aspect-[3/4] rounded-lg bg-muted overflow-hidden">
                        {url ? (
                          <StorageImage src={url} bucket="body-images" className="w-full h-full object-cover" alt={["Frente", "Lateral", "Costas"][i]} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            {["Frente", "Lateral", "Costas"][i]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {a.ai_analysis?.summary && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{a.ai_analysis.summary}</p>
                  )}

                  <div className="flex gap-3 mt-3 text-xs">
                    {a.body_type && <span>Biotipo: <strong>{a.body_type}</strong></span>}
                    {a.muscle_definition != null && <span>Definição: <strong>{a.muscle_definition}/10</strong></span>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {analyses.length === 0 && !analyzing && (
          <Card className="glass"><CardContent className="py-12 text-center">
            <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma análise corporal registrada.</p>
            <Button onClick={() => setNewDialogOpen(true)} className="mt-3 gradient-primary gap-2">
              <Camera className="w-4 h-4" /> Primeira Análise
            </Button>
          </CardContent></Card>
        )}

        {/* New Analysis Dialog */}
        <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" /> Nova Análise Corporal
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Tire 3 fotos do paciente: frente, lateral e costas. A IA analisará composição corporal e progresso.</p>
              <div className="grid grid-cols-3 gap-3">
                <PhotoUploadBox label="Frente" file={frontFile} setFile={setFrontFile} />
                <PhotoUploadBox label="Lateral" file={sideFile} setFile={setSideFile} />
                <PhotoUploadBox label="Costas" file={backFile} setFile={setBackFile} />
              </div>
              <div>
                <Label>Observações (opcional)</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notas sobre esta análise..." />
              </div>
              <Button onClick={handleSubmit} className="w-full gradient-primary gap-2" disabled={uploading || (!frontFile && !sideFile && !backFile)}>
                {uploading ? "Enviando fotos..." : "Salvar e Analisar com IA"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Análise de {selected ? new Date(selected.analysis_date).toLocaleDateString("pt-BR") : ""}</DialogTitle></DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[selected.front_image_url, selected.side_image_url, selected.back_image_url].map((url, i) => (
                    <div key={i} className="aspect-[3/4] rounded-lg bg-muted overflow-hidden">
                      {url && <StorageImage src={url} bucket="body-images" className="w-full h-full object-cover" alt="" />}
                    </div>
                  ))}
                </div>

                {(selected.body_fat_estimate || selected.body_type || selected.muscle_definition) && (
                  <div className="grid grid-cols-3 gap-3">
                    {selected.body_fat_estimate && (
                      <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <span className="text-xl font-bold text-primary">{selected.body_fat_estimate}%</span>
                        <span className="text-xs text-muted-foreground block">Gordura</span>
                      </div>
                    )}
                    {selected.muscle_definition && (
                      <div className="text-center p-3 rounded-lg bg-info/10 border border-info/20">
                        <span className="text-xl font-bold text-info">{selected.muscle_definition}/10</span>
                        <span className="text-xs text-muted-foreground block">Definição</span>
                      </div>
                    )}
                    {selected.body_type && (
                      <div className="text-center p-3 rounded-lg bg-muted border border-border">
                        <span className="text-sm font-bold capitalize">{selected.body_type}</span>
                        <span className="text-xs text-muted-foreground block">Biotipo</span>
                      </div>
                    )}
                  </div>
                )}

                {selected.ai_analysis?.summary && (
                  <div className="p-3 rounded-lg bg-muted">
                    <h4 className="font-medium text-sm mb-1">📊 Análise IA</h4>
                    <p className="text-sm text-muted-foreground">{selected.ai_analysis.summary}</p>
                  </div>
                )}

                {selected.progress_comparison?.highlights && (
                  <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                    <h4 className="font-medium text-sm mb-1 text-success">📈 Progresso</h4>
                    <p className="text-sm text-muted-foreground">{selected.progress_comparison.highlights}</p>
                  </div>
                )}

                {selected.notes && (
                  <div><h4 className="font-medium text-sm mb-1">📝 Notas</h4><p className="text-sm text-muted-foreground">{selected.notes}</p></div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
