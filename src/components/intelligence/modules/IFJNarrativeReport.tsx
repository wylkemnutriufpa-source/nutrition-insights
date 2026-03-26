/**
 * IFJ Narrative Report — Generate clinical narrative PDF reports
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, Download, Brain, Eye, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";

export default function IFJNarrativeReport() {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState("");
  const [report, setReport] = useState<string | null>(null);
  const [clinicalData, setClinicalData] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { data: patients } = useQuery({
    queryKey: ["patients-for-report", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("patients")
        .select("id, full_name, status, journey_status")
        .eq("nutritionist_id", user!.id)
        .eq("status", "active")
        .order("full_name");
      return (data || []) as { id: string; full_name: string; status: string; journey_status: string }[];
    },
    enabled: !!user,
  });

  const generateReport = async () => {
    if (!selectedPatient || !user) return;
    setGenerating(true);
    setReport(null);
    setClinicalData(null);

    try {
      const { data, error } = await supabase.functions.invoke("ifj-narrative-report", {
        body: { patient_id: selectedPatient },
      });
      if (error) throw error;
      setReport(data.report);
      setClinicalData(data.clinical_data);
      setShowPreview(true);
      toast.success("Relatório narrativo gerado com sucesso!");
    } catch (e) {
      toast.error("Erro ao gerar relatório narrativo");
    }
    setGenerating(false);
  };

  const downloadAsText = () => {
    if (!report || !clinicalData) return;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Relatorio_Clinico_${clinicalData.patient_name?.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório baixado!");
  };

  const selectedName = patients?.find(p => p.id === selectedPatient)?.full_name;

  return (
    <Card className="border-amber-500/20 bg-background/95 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-amber-500/20 flex items-center justify-center">
            <FileText className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <span className="bg-gradient-to-r from-emerald-500 to-amber-500 bg-clip-text text-transparent font-bold">
              IFJ Relatório Narrativo
            </span>
            <p className="text-[10px] text-muted-foreground font-normal">Relatórios clínicos automáticos com IA</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Patient selector */}
        <div className="flex gap-2">
          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
            <SelectTrigger className="border-amber-500/20">
              <SelectValue placeholder="Selecione um paciente" />
            </SelectTrigger>
            <SelectContent>
              {(patients || []).map(p => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={generateReport}
            disabled={!selectedPatient || generating}
            className="shrink-0 bg-gradient-to-r from-amber-500 to-primary"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Gerando...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Gerar Relatório</>
            )}
          </Button>
        </div>

        {/* Loading state */}
        {generating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-12 gap-3"
          >
            <div className="relative">
              <Brain className="w-12 h-12 text-amber-500/30" />
              <motion.div
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-full h-full rounded-full border-2 border-transparent border-t-amber-500/50" />
              </motion.div>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Analisando dados clínicos de {selectedName}...</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">A IFJ está compilando histórico, métricas e tendências</p>
            </div>
          </motion.div>
        )}

        {/* Report preview */}
        {report && showPreview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Clinical summary badges */}
            {clinicalData && (
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[9px]">
                  {clinicalData.days_in_program} dias no programa
                </Badge>
                {clinicalData.avg_adherence && (
                  <Badge variant="outline" className={`text-[9px] ${
                    clinicalData.avg_adherence > 70 ? "border-emerald-500/30 text-emerald-600" : "border-orange-500/30 text-orange-600"
                  }`}>
                    Adesão: {clinicalData.avg_adherence.toFixed(0)}%
                  </Badge>
                )}
                {clinicalData.weight_delta !== null && (
                  <Badge variant="outline" className={`text-[9px] ${
                    clinicalData.weight_delta < 0 ? "border-emerald-500/30 text-emerald-600" : "border-orange-500/30 text-orange-600"
                  }`}>
                    Peso: {clinicalData.weight_delta > 0 ? "+" : ""}{clinicalData.weight_delta?.toFixed(1)}kg
                  </Badge>
                )}
                <Badge variant="outline" className="text-[9px]">
                  Risco: {clinicalData.latest_risk_level || "N/A"}
                </Badge>
              </div>
            )}

            {/* Report content */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 overflow-hidden">
              <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-medium text-amber-600">Pré-visualização</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={downloadAsText}>
                  <Download className="w-3 h-3 mr-1" /> Baixar MD
                </Button>
              </div>
              <ScrollArea className="h-[400px] p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{report}</ReactMarkdown>
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {!report && !generating && (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">Selecione um paciente para gerar um relatório clínico narrativo completo</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Inclui evolução, adesão, riscos, diagnóstico e recomendações
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
