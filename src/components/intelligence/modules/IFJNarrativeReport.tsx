/**
 * IFJ Narrative Report — Generate clinical narrative reports
 * Uses correct tables: nutritionist_patients + profiles
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
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
  const { user, roles } = useAuth();
  const { tenantId } = useTenant();
  const [selectedPatient, setSelectedPatient] = useState("");
  const [report, setReport] = useState<string | null>(null);
  const [clinicalData, setClinicalData] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const isAdmin = roles?.includes("admin");

  const { data: patients } = useQuery({
    queryKey: ["patients-for-report", user?.id, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("status", "active");

      if (!isAdmin) {
        query = query.eq("nutritionist_id", user!.id);
      }

      const { data: links } = await query;
      if (!links || links.length === 0) return [];

      const patientIds = links.map(l => l.patient_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", patientIds)
        .order("full_name");

      return (profiles || []).map((p: any) => ({ id: p.user_id, full_name: p.full_name || "Paciente" }));
    },
    enabled: !!user,
  });

  const generateReport = async () => {
    if (!selectedPatient || !user) return;
    setGenerating(true);
    setReport(null);
    setClinicalData(null);

    try {
      // Build report from real data (deterministic, no LLM)
      const patientName = patients?.find(p => p.id === selectedPatient)?.full_name || "Paciente";

      // Fetch clinical data
      const [snapshotRes, anamnesisRes, mealsRes, alertsRes] = await Promise.all([
        supabase.from("clinical_daily_snapshots").select("*").eq("patient_id", selectedPatient).order("snapshot_date", { ascending: false }).limit(7),
        withTenantFilter(supabase.from("patient_anamnesis").select("*").eq("user_id", selectedPatient).order("created_at", { ascending: false }), tenantId).limit(1),
        withTenantFilter(supabase.from("meal_plans").select("id, description, is_active, plan_status, created_at").eq("patient_id", selectedPatient).eq("is_active", true), tenantId).limit(1),
        withTenantFilter(supabase.from("clinical_alerts").select("*").eq("patient_id", selectedPatient).eq("is_active", true).order("created_at", { ascending: false }), tenantId).limit(5),
      ]);

      const snapshots = snapshotRes.data || [];
      const anamnesis = anamnesisRes.data?.[0];
      const activePlan = mealsRes.data?.[0] as any;
      const alerts = alertsRes.data || [];
      const latest = snapshots[0];

      const data = {
        patient_name: patientName,
        days_in_program: anamnesis ? Math.floor((Date.now() - new Date(anamnesis.created_at).getTime()) / 86400000) : 0,
        avg_adherence: latest?.adherence_score,
        weight_delta: latest?.weight_change_7d,
        latest_risk_level: latest?.risk_level || "N/A",
        active_plan: activePlan?.description || "Nenhum",
        active_alerts: alerts.length,
      };
      setClinicalData(data);

      // Generate deterministic narrative
      const lines: string[] = [];
      lines.push(`# Relatório Clínico — ${patientName}`);
      lines.push(`**Data:** ${new Date().toLocaleDateString("pt-BR")}`);
      lines.push("");
      lines.push("## Resumo Geral");
      lines.push(`- **Dias no programa:** ${data.days_in_program}`);
      lines.push(`- **Plano ativo:** ${data.active_plan}`);
      lines.push(`- **Nível de risco:** ${data.latest_risk_level}`);
      if (data.avg_adherence != null) lines.push(`- **Adesão:** ${data.avg_adherence.toFixed(0)}%`);
      if (data.weight_delta != null) lines.push(`- **Variação de peso (7d):** ${data.weight_delta > 0 ? "+" : ""}${data.weight_delta.toFixed(1)}kg`);
      lines.push("");

      if (alerts.length > 0) {
        lines.push("## Alertas Clínicos Ativos");
        alerts.forEach((a: any) => {
          lines.push(`- **${a.severity?.toUpperCase()}** — ${a.title}: ${a.description}`);
        });
        lines.push("");
      }

      if (snapshots.length > 1) {
        lines.push("## Evolução (últimos 7 dias)");
        lines.push("| Data | Adesão | Peso | Risco |");
        lines.push("|------|--------|------|-------|");
        snapshots.forEach((s: any) => {
          lines.push(`| ${s.snapshot_date} | ${s.adherence_score?.toFixed(0) ?? "-"}% | ${s.current_weight ?? "-"}kg | ${s.risk_level ?? "-"} |`);
        });
        lines.push("");
      }

      lines.push("## Análise");
      if (data.avg_adherence != null && data.avg_adherence < 50) {
        lines.push("⚠️ Adesão abaixo de 50%. Recomenda-se revisão do plano e contato proativo com o paciente.");
      } else if (data.avg_adherence != null && data.avg_adherence >= 80) {
        lines.push("✅ Excelente adesão. Paciente demonstra comprometimento consistente com o plano.");
      } else if (data.avg_adherence != null) {
        lines.push("📊 Adesão moderada. Monitorar tendências e considerar ajustes pontuais.");
      }

      if (data.weight_delta != null) {
        if (data.weight_delta < -1) lines.push("📉 Perda de peso significativa nos últimos 7 dias.");
        else if (data.weight_delta > 1) lines.push("📈 Ganho de peso nos últimos 7 dias. Avaliar causas.");
        else lines.push("➡️ Peso estável nos últimos 7 dias.");
      }

      lines.push("");
      lines.push("---");
      lines.push("*Relatório gerado automaticamente pelo IFJ Core — 100% determinístico, baseado em dados reais.*");

      setReport(lines.join("\n"));
      setShowPreview(true);
      toast.success("Relatório narrativo gerado!");
    } catch (e) {
      console.error(e);
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
            <p className="text-[10px] text-muted-foreground font-normal">Relatórios clínicos determinísticos com dados reais</p>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-12 gap-3">
            <div className="relative">
              <Brain className="w-12 h-12 text-amber-500/30" />
              <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                <div className="w-full h-full rounded-full border-2 border-transparent border-t-amber-500/50" />
              </motion.div>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Compilando dados clínicos de {selectedName}...</p>
            </div>
          </motion.div>
        )}

        {/* Report preview */}
        {report && showPreview && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {clinicalData && (
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[9px]">{clinicalData.days_in_program} dias no programa</Badge>
                {clinicalData.avg_adherence != null && (
                  <Badge variant="outline" className={`text-[9px] ${clinicalData.avg_adherence > 70 ? "border-emerald-500/30 text-emerald-600" : "border-orange-500/30 text-orange-600"}`}>
                    Adesão: {clinicalData.avg_adherence.toFixed(0)}%
                  </Badge>
                )}
                {clinicalData.weight_delta != null && (
                  <Badge variant="outline" className={`text-[9px] ${clinicalData.weight_delta < 0 ? "border-emerald-500/30 text-emerald-600" : "border-orange-500/30 text-orange-600"}`}>
                    Peso: {clinicalData.weight_delta > 0 ? "+" : ""}{clinicalData.weight_delta?.toFixed(1)}kg
                  </Badge>
                )}
                <Badge variant="outline" className="text-[9px]">Risco: {clinicalData.latest_risk_level}</Badge>
                <Badge variant="outline" className="text-[9px]">Alertas: {clinicalData.active_alerts}</Badge>
              </div>
            )}

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
            <p className="text-sm text-muted-foreground">Selecione um paciente para gerar um relatório clínico narrativo</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Inclui evolução, adesão, alertas, peso e recomendações — 100% baseado em dados reais
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
