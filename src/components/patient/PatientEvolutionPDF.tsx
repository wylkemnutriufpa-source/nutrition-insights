import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { buildWhatsAppUrl } from "@/utils/whatsappNotification";

interface Props {
  patientId: string;
  patientName: string;
}

export default function PatientEvolutionPDF({ patientId, patientName }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const getReportData = async () => {
    if (!user) return null;
    const [assessmentsRes, checklistRes, planRes, profileRes] = await Promise.all([
      supabase
        .from("physical_assessments")
        .select("weight, height, body_fat_percentage, bmi, lean_mass, fat_mass, assessment_date")
        .eq("patient_id", patientId)
        .order("assessment_date", { ascending: true })
        .limit(20),
      supabase
        .from("checklist_tasks")
        .select("completed, date")
        .eq("patient_id", patientId)
        .gte("date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]),
      supabase
        .from("meal_plans")
        .select("title, plan_status, total_target_calories, total_target_protein, total_target_carbs, total_target_fat")
        .eq("patient_id", patientId)
        .eq("plan_status", "published")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
    ]);

    const assessments = assessmentsRes.data || [];
    const tasks = checklistRes.data || [];
    const plan = planRes.data;
    const profName = profileRes.data?.full_name || "Profissional";

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    const adherence = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const weightData = assessments.filter((a) => a.weight);
    const firstWeight = weightData[0]?.weight;
    const lastWeight = weightData[weightData.length - 1]?.weight;
    const weightChange = firstWeight && lastWeight ? (lastWeight - firstWeight).toFixed(1) : null;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #1a1a2e; padding: 40px; background: white; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #6d28d9; }
  .logo { font-size: 24px; font-weight: 700; color: #6d28d9; }
  .logo span { color: #a78bfa; }
  .meta { text-align: right; font-size: 12px; color: #6b7280; }
  .meta strong { color: #1a1a2e; }
  h1 { font-size: 22px; margin: 20px 0 8px; color: #1a1a2e; }
  h2 { font-size: 16px; color: #6d28d9; margin: 18px 0 10px; border-left: 4px solid #6d28d9; padding-left: 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin: 15px 0; }
  .metric { background: #f5f3ff; padding: 12px; border-radius: 8px; text-align: center; }
  .metric .value { font-size: 24px; font-weight: 700; color: #6d28d9; }
  .metric .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
  th { background: #6d28d9; color: white; padding: 8px 10px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; }
  td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) { background: #faf5ff; }
  .bar-container { background: #e5e7eb; border-radius: 4px; height: 8px; margin-top: 8px; }
  .bar { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #6d28d9, #a78bfa); }
  .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
  .change { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
  .change.positive { background: #dcfce7; color: #16a34a; }
  .change.negative { background: #fef2f2; color: #dc2626; }
  @media print { body { padding: 20px; } }
</style></head><body>
  <div class="header">
    <div>
      <div class="logo">Fit<span>Journey</span></div>
      <p style="font-size:11px;color:#6b7280;margin-top:4px">Relatório de Evolução do Paciente</p>
    </div>
    <div class="meta">
      <p><strong>Paciente:</strong> ${patientName}</p>
      <p><strong>Profissional:</strong> ${profName}</p>
      <p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
    </div>
  </div>

  <h1>Resumo da Evolução</h1>
  <div class="grid">
    <div class="metric">
      <div class="value">${lastWeight ? `${lastWeight}kg` : "—"}</div>
      <div class="label">Peso Atual</div>
    </div>
    <div class="metric">
      <div class="value">${weightChange ? `<span class="change ${Number(weightChange) <= 0 ? "positive" : "negative"}">${Number(weightChange) > 0 ? "+" : ""}${weightChange}kg</span>` : "—"}</div>
      <div class="label">Variação de Peso</div>
    </div>
    <div class="metric">
      <div class="value">${adherence}%</div>
      <div class="label">Adesão (30 dias)</div>
      <div class="bar-container"><div class="bar" style="width:${adherence}%"></div></div>
    </div>
    <div class="metric">
      <div class="value">${assessments.length}</div>
      <div class="label">Avaliações</div>
    </div>
  </div>

  ${assessments.length > 0 ? `
    <h2>Histórico de Avaliações</h2>
    <table>
      <tr><th>Data</th><th>Peso</th><th>IMC</th><th>% Gordura</th><th>Massa Magra</th><th>Massa Gorda</th></tr>
      ${assessments.map((a) => `
        <tr>
          <td>${new Date(a.assessment_date).toLocaleDateString("pt-BR")}</td>
          <td>${a.weight ? `${a.weight}kg` : "—"}</td>
          <td>${a.bmi ? a.bmi.toFixed(1) : "—"}</td>
          <td>${a.body_fat_percentage ? `${a.body_fat_percentage}%` : "—"}</td>
          <td>${a.lean_mass ? `${a.lean_mass}kg` : "—"}</td>
          <td>${a.fat_mass ? `${a.fat_mass}kg` : "—"}</td>
        </tr>
      `).join("")}
    </table>
  ` : ""}

  ${plan ? `
    <h2>Plano Alimentar Atual</h2>
    <div class="grid">
      <div class="metric"><div class="value">${plan.total_target_calories || "—"}</div><div class="label">Kcal/dia</div></div>
      <div class="metric"><div class="value">${plan.total_target_protein ? `${plan.total_target_protein}g` : "—"}</div><div class="label">Proteínas</div></div>
      <div class="metric"><div class="value">${plan.total_target_carbs ? `${plan.total_target_carbs}g` : "—"}</div><div class="label">Carboidratos</div></div>
      <div class="metric"><div class="value">${plan.total_target_fat ? `${plan.total_target_fat}g` : "—"}</div><div class="label">Gorduras</div></div>
    </div>
  ` : ""}

  <div class="footer">
    Gerado automaticamente pelo FitJourney · ${new Date().toLocaleDateString("pt-BR")} · Este documento é confidencial
  </div>
</body></html>`;

    return { html, profName };
  };

  const generate = async () => {
    setLoading(true);
    try {
      const data = await getReportData();
      if (!data) return;

      const { html } = data;
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evolucao-${patientName.replace(/\s+/g, "-").toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      toast.success("Relatório gerado!");
    } catch {
      toast.error("Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsApp = async () => {
    setSending(true);
    try {
      const data = await getReportData();
      if (!data) return;

      const { html, profName } = data;
      
      // Upload report to shared storage
      const fileName = `report-${patientId}-${Date.now()}.html`;
      const blob = new Blob([html], { type: "text/html" });
      
      const { error: uploadError } = await supabase.storage
        .from("shared-meal-plans")
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("shared-meal-plans")
        .getPublicUrl(fileName);

      // Get patient phone
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("phone")
        .eq("user_id", patientId)
        .maybeSingle();

      if (profileError || !profile?.phone) {
        toast.error("Telefone do paciente não encontrado.");
        return;
      }

      const message = `Olá ${patientName.split(" ")[0]}! Aqui é o(a) nutricionista ${profName}. 🎉\n\nAcabei de gerar seu Relatório de Evolução atualizado. Você pode visualizá-lo clicando no link abaixo:\n\n${publicUrl}\n\nQualquer dúvida, estou à disposição!`;

      const whatsappUrl = buildWhatsAppUrl(profile.phone, message);
      window.open(whatsappUrl, "_blank");
      toast.success("WhatsApp aberto!");
    } catch (err: any) {
      console.error("WhatsApp error:", err);
      toast.error("Erro ao preparar envio via WhatsApp");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={generate} disabled={loading || sending} className="gap-1.5">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
        Relatório PDF
      </Button>
      
      <Button variant="outline" size="sm" onClick={sendWhatsApp} disabled={loading || sending} className="gap-1.5 border-emerald-500/30 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500 hover:text-white">
        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
        Enviar via WhatsApp
      </Button>
    </div>
  );
}
