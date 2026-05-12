import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, BarChart3, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PatientRevenueSimulator() {
  const [plans, setPlans] = useState<{ name: string; price: number }[]>([]);

  useEffect(() => {
    supabase
      .from("pricing_plans")
      .select("name, price_monthly")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPlans(data.map((p) => ({ name: p.name, price: p.price_monthly })));
          const avg = Math.round(data.reduce((s, p) => s + p.price_monthly, 0) / data.length);
          setSim((prev) => ({ ...prev, ticket: avg }));
        }
      });
  }, []);

  const [sim, setSim] = useState({
    totalPatients: 100,
    newPatientsMonth: 15,
    ticket: 79,
    retention: 90,
    churnRate: 10,
    consultaAvulsa: 150,
    avulsosMonth: 5,
  });

  const mrrBase = sim.totalPatients * sim.ticket;
  const revenueAvulsos = sim.avulsosMonth * sim.consultaAvulsa;
  const totalMonth1 = mrrBase + revenueAvulsos;
  const churnedPatients = Math.round(sim.totalPatients * (sim.churnRate / 100));
  const netNewPatients = sim.newPatientsMonth - churnedPatients;

  const projection = useMemo(() =>
    Array.from({ length: 12 }, (_, month) => {
      const activePatients = Math.max(0, sim.totalPatients + netNewPatients * (month + 1));
      const mrr = activePatients * sim.ticket;
      const avulsos = sim.avulsosMonth * sim.consultaAvulsa;
      const total = mrr + avulsos;
      const accumulated = Array.from({ length: month + 1 }, (_, m) => {
        const ap = Math.max(0, sim.totalPatients + netNewPatients * (m + 1));
        return ap * sim.ticket + avulsos;
      }).reduce((a, b) => a + b, 0);
      return { month: month + 1, activePatients: Math.round(activePatients), mrr, avulsos, total, accumulated };
    }), [sim, netNewPatients]
  );

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Simulador de Faturamento — Pacientes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Projete sua receita com base na carteira de pacientes
          {plans.length > 0 && (
            <span className="ml-2 text-xs">
              (Planos: {plans.map((p) => `${p.name} R$${p.price}`).join(" · ")})
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="space-y-5">
            <SimSlider label="Pacientes Ativos Atuais" value={sim.totalPatients} min={1} max={500} step={1}
              onChange={(v) => setSim({ ...sim, totalPatients: v })} />
            <SimSlider label="Novos Pacientes/Mês" value={sim.newPatientsMonth} min={0} max={50} step={1}
              onChange={(v) => setSim({ ...sim, newPatientsMonth: v })} color="text-emerald-400" />
            <SimSlider label="Ticket Médio Mensal (R$)" value={sim.ticket} min={19} max={500} step={1}
              onChange={(v) => setSim({ ...sim, ticket: v })} prefix="R$ " />
            <SimSlider label="Churn Mensal (%)" value={sim.churnRate} min={0} max={30} step={1}
              onChange={(v) => setSim({ ...sim, churnRate: v })} suffix="%" color="text-destructive" />
            <div className="border-t border-border pt-4 space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Consultas Avulsas</p>
              <SimSlider label="Valor Consulta Avulsa (R$)" value={sim.consultaAvulsa} min={50} max={500} step={10}
                onChange={(v) => setSim({ ...sim, consultaAvulsa: v })} prefix="R$ " color="text-violet-400" />
              <SimSlider label="Consultas Avulsas/Mês" value={sim.avulsosMonth} min={0} max={30} step={1}
                onChange={(v) => setSim({ ...sim, avulsosMonth: v })} color="text-violet-400" />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <MetricBox label="MRR (Recorrente)" value={`R$ ${mrrBase.toLocaleString("pt-BR")}`} bgClass="bg-primary/10 border-primary/20" textClass="text-primary" />
              <MetricBox label="Receita Avulsos" value={`R$ ${revenueAvulsos.toLocaleString("pt-BR")}`} bgClass="bg-violet-500/10 border-violet-500/20" textClass="text-violet-400" />
              <MetricBox label="Total Mês Atual" value={`R$ ${totalMonth1.toLocaleString("pt-BR")}`} bgClass="bg-emerald-500/10 border-emerald-500/20" textClass="text-emerald-400" />
              <MetricBox label="Crescimento Líq./Mês" value={`${netNewPatients >= 0 ? "+" : ""}${netNewPatients} pacientes`}
                bgClass={netNewPatients >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-destructive/10 border-destructive/20"}
                textClass={netNewPatients >= 0 ? "text-emerald-400" : "text-destructive"} />
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-emerald-500/10 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Projeção MRR em 12 meses</p>
              <p className="text-3xl font-bold text-primary">R$ {projection[11]?.mrr.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground">com ~{projection[11]?.activePatients} pacientes ativos</p>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <p className="text-xs font-medium text-amber-400">Faturamento Acumulado 12 meses</p>
              </div>
              <p className="text-2xl font-bold text-amber-400">R$ {projection[11]?.accumulated.toLocaleString("pt-BR")}</p>
            </div>
          </div>
        </div>

        {/* Projection Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-primary" /> Projeção 12 Meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Pacientes</TableHead>
                  <TableHead>MRR</TableHead>
                  <TableHead>Avulsos</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projection.map((p) => (
                  <TableRow key={p.month}>
                    <TableCell className="font-bold">Mês {p.month}</TableCell>
                    <TableCell>{p.activePatients}</TableCell>
                    <TableCell className="text-primary">R$ {p.mrr.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-violet-400">R$ {p.avulsos.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="font-bold text-emerald-400">R$ {p.total.toLocaleString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

function SimSlider({ label, value, min, max, step, onChange, prefix, suffix, color = "text-primary" }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; prefix?: string; suffix?: string; color?: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <Label className="text-sm">{label}</Label>
        <span className={`text-sm font-bold ${color}`}>{prefix}{value}{suffix}</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} />
    </div>
  );
}

function MetricBox({ label, value, bgClass, textClass }: { label: string; value: string; bgClass: string; textClass: string }) {
  return (
    <div className={`p-4 rounded-xl ${bgClass} border text-center`}>
      <p className={`text-xl font-bold ${textClass}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
