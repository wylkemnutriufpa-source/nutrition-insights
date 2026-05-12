import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Download, Loader2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Reports() {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState("");
  const [generating, setGenerating] = useState(false);

  const { data: patients = [] } = useQuery({
    queryKey: ["report-patients", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: links } = await supabase.from("nutritionist_patients")
        .select("patient_id").eq("nutritionist_id", user.id).eq("status", "active");
      if (!links?.length) return [];
      const ids = links.map(l => l.patient_id);
      const { data: profiles } = await supabase.from("profiles")
        .select("user_id, full_name").in("user_id", ids);
      return profiles || [];
    },
    enabled: !!user,
  });

  const generateReport = async () => {
    if (!user || !selectedPatient) return;
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-report", {
        body: { patient_id: selectedPatient, nutritionist_id: user.id, report_type: "complete" },
      });

      if (error) throw error;

      // Download directly
      const blob = new Blob([data.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${(data.patient_name || "paciente").replace(/\s+/g, "-").toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success(`Relatório de ${data.patient_name} gerado!`);
    } catch (e: any) {
      toast.error("Erro: " + (e.message || "Tente novamente"));
    }
    setGenerating(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Relatórios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gere relatórios completos dos seus pacientes com resumo IA.</p>
        </div>

        <Card className="glass border-border">
          <CardHeader><CardTitle className="text-base">Gerar Relatório</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Paciente</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger><SelectValue placeholder="Selecione um paciente" /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || "Sem nome"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
              <h4 className="font-medium">O relatório inclui:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-primary" /> Resumo executivo gerado por IA</li>
                <li className="flex items-center gap-2">📐 Última avaliação física</li>
                <li className="flex items-center gap-2">📈 Evolução (peso, IMC, % gordura)</li>
                <li className="flex items-center gap-2">🍽️ Plano alimentar ativo</li>
                <li className="flex items-center gap-2">🍎 Refeições recentes com score IA</li>
                <li className="flex items-center gap-2">📊 Análises corporais</li>
              </ul>
            </div>

            <Button onClick={generateReport} className="w-full gradient-primary gap-2" disabled={!selectedPatient || generating}>
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Download className="w-4 h-4" /> Gerar e Imprimir (PDF)</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass border-border">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            <p>💡 O relatório abre em nova aba pronto para impressão. Use <strong>Ctrl+P</strong> → <strong>Salvar como PDF</strong> para exportar.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
