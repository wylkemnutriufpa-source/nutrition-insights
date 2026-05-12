import { useState } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { Button } from "@v1/components/ui/button";
import { Card, CardContent } from "@v1/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Badge } from "@v1/components/ui/badge";
import { toast } from "sonner";
import { FileText, Download, Printer, Dumbbell } from "lucide-react";

interface Props {
  plans: any[];
  students: { student_id: string; full_name: string }[];
}

export default function WorkoutPDFExport({ plans, students }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    if (!selectedPlan) return;
    setGenerating(true);

    try {
      const plan = plans.find(p => p.id === selectedPlan);
      if (!plan) return;

      const { data: routines } = await supabase
        .from("workout_routines")
        .select("*, workout_exercises(*)")
        .eq("plan_id", selectedPlan)
        .order("sort_order");

      const student = students.find(s => s.student_id === plan.student_id);

      // Build printable HTML
      const html = `
<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${plan.title} - FitJourney</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 24px; max-width: 800px; margin: 0 auto; }
  .header { border-bottom: 3px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #6366f1; }
  .header p { font-size: 12px; color: #666; margin-top: 4px; }
  .meta { display: flex; gap: 16px; margin: 12px 0; font-size: 11px; color: #888; }
  .meta span { background: #f3f4f6; padding: 4px 10px; border-radius: 12px; }
  .routine { margin-bottom: 24px; page-break-inside: avoid; }
  .routine h2 { font-size: 16px; color: #374151; border-left: 4px solid #6366f1; padding-left: 10px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f3f4f6; padding: 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
  td { padding: 8px; border-bottom: 1px solid #f3f4f6; }
  tr:nth-child(even) { background: #fafafa; }
  .group-badge { display: inline-block; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; color: white; margin-right: 4px; }
  .biset { background: #3b82f6; }
  .triset { background: #8b5cf6; }
  .circuit { background: #f59e0b; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #aaa; text-align: center; }
  .notes-box { margin-top: 20px; border: 1px dashed #d1d5db; padding: 16px; border-radius: 8px; }
  .notes-box h3 { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
  .notes-line { border-bottom: 1px solid #e5e7eb; height: 24px; }
  @media print { body { padding: 12px; } .no-print { display: none; } }
</style>
</head><body>
<div class="header">
  <h1>🏋️ ${plan.title}</h1>
  <p>${student?.full_name || "Aluno"} • Objetivo: ${plan.objective || "—"}</p>
  <div class="meta">
    <span>Status: ${plan.status === "active" ? "✅ Ativo" : "⏸ Pausado"}</span>
    <span>Criado: ${new Date(plan.created_at).toLocaleDateString("pt-BR")}</span>
    ${plan.weeks_duration ? `<span>Duração: ${plan.weeks_duration} semanas</span>` : ""}
  </div>
</div>

${(routines || []).map(r => `
<div class="routine">
  <h2>${r.name}</h2>
  <table>
    <thead><tr><th>#</th><th>Exercício</th><th>Séries</th><th>Reps</th><th>Carga</th><th>Descanso</th><th>Obs</th></tr></thead>
    <tbody>
      ${(r.workout_exercises || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((ex: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>
            ${ex.group_type && ex.group_type !== "single" ? `<span class="group-badge ${ex.group_type}">${ex.group_type.toUpperCase()}</span>` : ""}
            ${ex.name}
          </td>
          <td>${ex.sets || "—"}</td>
          <td>${ex.reps || "—"}</td>
          <td>${ex.load_kg ? `${ex.load_kg}kg` : "—"}</td>
          <td>${ex.rest_seconds ? `${ex.rest_seconds}s` : "—"}</td>
          <td style="font-size:10px;color:#888">${ex.notes || ""}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
</div>
`).join("")}

<div class="notes-box">
  <h3>📝 Observações do Treino</h3>
  ${Array(5).fill(0).map(() => '<div class="notes-line"></div>').join("")}
</div>

<div class="footer">
  FitJourney • Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
</div>


</body></html>`;

      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `treino-${plan.title.replace(/\s+/g, "-").toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("Treino baixado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar relatório");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Exportar Treino</h2>
      </div>

      <div className="flex gap-2 flex-wrap items-end">
        <Select value={selectedPlan} onValueChange={setSelectedPlan}>
          <SelectTrigger className="w-[280px]"><SelectValue placeholder="Selecionar plano" /></SelectTrigger>
          <SelectContent>
            {plans.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={generatePDF} disabled={!selectedPlan || generating} className="gap-1.5">
          <Printer className="w-4 h-4" />
          {generating ? "Gerando..." : "Gerar PDF"}
        </Button>
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum plano disponível para exportar</p>
        </div>
      )}
    </div>
  );
}
