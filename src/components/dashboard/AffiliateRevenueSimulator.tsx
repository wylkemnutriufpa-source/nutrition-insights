import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Label } from "@v1/components/ui/label";
import { Slider } from "@v1/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@v1/components/ui/table";
import { Calculator, BarChart3 } from "lucide-react";

interface Props {
  compact?: boolean;
}

export default function AffiliateRevenueSimulator({ compact = false }: Props) {
  const [sim, setSim] = useState({
    affiliates: 1000,
    activeRate: 20,
    clientsPerAffiliate: 2,
    ticket: 79,
    retention: 85,
    firstCommission: 20,
    recurringCommission: 5,
  });

  const activeAffiliates = Math.round(sim.affiliates * (sim.activeRate / 100));
  const newClientsMonth = activeAffiliates * sim.clientsPerAffiliate;
  const revenueMonth1 = newClientsMonth * sim.ticket;
  const firstComm = revenueMonth1 * (sim.firstCommission / 100);
  const netMonth1 = revenueMonth1 - firstComm;

  const projection = useMemo(() =>
    Array.from({ length: 6 }, (_, month) => {
      const cumulative = Array.from({ length: month + 1 }, (_, m) =>
        Math.round(newClientsMonth * Math.pow(sim.retention / 100, m))
      ).reduce((a, b) => a + b, 0);
      const revenue = cumulative * sim.ticket;
      const recCommission = revenue * (sim.recurringCommission / 100);
      const monthFirstComm = newClientsMonth * sim.ticket * (sim.firstCommission / 100);
      return {
        month: month + 1,
        newClients: newClientsMonth,
        cumulative,
        revenue,
        firstComm: monthFirstComm,
        recCommission,
        net: revenue - recCommission - monthFirstComm,
      };
    }), [sim, newClientsMonth]
  );

  return (
    <Card className="border-amber-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-amber-400" />
          Simulador de Faturamento — Programa de Afiliados
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ajuste os parâmetros e veja a projeção de faturamento em tempo real
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className={`grid grid-cols-1 ${compact ? "" : "md:grid-cols-2"} gap-6`}>
          {/* Inputs */}
          <div className="space-y-5">
            <SliderField label="Total de Afiliados" value={sim.affiliates} min={10} max={5000} step={10}
              onChange={(v) => setSim({ ...sim, affiliates: v })} />
            <SliderField label="Taxa de Ativação (%)" value={sim.activeRate} min={5} max={80} step={1}
              onChange={(v) => setSim({ ...sim, activeRate: v })} suffix="%" />
            <SliderField label="Clientes/Afiliado/Mês" value={sim.clientsPerAffiliate} min={1} max={10} step={1}
              onChange={(v) => setSim({ ...sim, clientsPerAffiliate: v })} />
            <SliderField label="Ticket Médio (R$)" value={sim.ticket} min={19} max={297} step={1}
              onChange={(v) => setSim({ ...sim, ticket: v })} prefix="R$ " />
            <SliderField label="Retenção Mensal (%)" value={sim.retention} min={50} max={99} step={1}
              onChange={(v) => setSim({ ...sim, retention: v })} suffix="%" colorClass="text-emerald-400" />
            <div className="grid grid-cols-2 gap-4">
              <SliderField label="1ª Venda (%)" value={sim.firstCommission} min={5} max={50} step={1}
                onChange={(v) => setSim({ ...sim, firstCommission: v })} suffix="%" small />
              <SliderField label="Recorrente (%)" value={sim.recurringCommission} min={1} max={20} step={1}
                onChange={(v) => setSim({ ...sim, recurringCommission: v })} suffix="%" small />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <ResultCard label="Afiliados Ativos" value={String(activeAffiliates)} bgClass="bg-blue-500/10 border-blue-500/20" textClass="text-blue-400" />
              <ResultCard label="Novos Clientes/Mês" value={String(newClientsMonth)} bgClass="bg-violet-500/10 border-violet-500/20" textClass="text-violet-400" />
              <ResultCard label="Receita Bruta Mês 1" value={`R$ ${revenueMonth1.toLocaleString("pt-BR")}`} bgClass="bg-amber-500/10 border-amber-500/20" textClass="text-amber-400" />
              <ResultCard label="Receita Líquida Mês 1" value={`R$ ${netMonth1.toLocaleString("pt-BR")}`} bgClass="bg-emerald-500/10 border-emerald-500/20" textClass="text-emerald-400" />
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20">
              <p className="text-xs text-muted-foreground mb-1">Projeção MRR Mês 6 (acumulado)</p>
              <p className="text-3xl font-bold text-amber-400">R$ {projection[5]?.revenue.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground">com ~{projection[5]?.cumulative} clientes ativos</p>
            </div>
          </div>
        </div>

        {/* Projection Table */}
        {!compact && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-4 h-4 text-amber-400" /> Projeção 6 Meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead>Novos</TableHead>
                    <TableHead>Acumulado</TableHead>
                    <TableHead>Receita</TableHead>
                    <TableHead>Com. 1ª</TableHead>
                    <TableHead>Com. Rec.</TableHead>
                    <TableHead>Líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projection.map((p) => (
                    <TableRow key={p.month}>
                      <TableCell className="font-bold">Mês {p.month}</TableCell>
                      <TableCell>{p.newClients}</TableCell>
                      <TableCell className="font-medium">{p.cumulative}</TableCell>
                      <TableCell className="text-amber-400">R$ {p.revenue.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-yellow-400">R$ {p.firstComm.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-cyan-400">R$ {p.recCommission.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="font-bold text-emerald-400">R$ {p.net.toLocaleString("pt-BR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

function SliderField({ label, value, min, max, step, onChange, prefix, suffix, colorClass = "text-amber-400", small }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; prefix?: string; suffix?: string; colorClass?: string; small?: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <Label className={small ? "text-xs" : "text-sm"}>{label}</Label>
        <span className={`${small ? "text-xs" : "text-sm"} font-bold ${colorClass}`}>
          {prefix}{value}{suffix}
        </span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} />
    </div>
  );
}

function ResultCard({ label, value, bgClass, textClass }: { label: string; value: string; bgClass: string; textClass: string }) {
  return (
    <div className={`p-4 rounded-xl ${bgClass} border text-center`}>
      <p className={`text-2xl font-bold ${textClass}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
