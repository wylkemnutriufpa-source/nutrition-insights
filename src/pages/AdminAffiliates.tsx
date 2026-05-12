import { useState } from "react";
import { useTenant } from "@v1/lib/tenantContext";
import { withTenantFilter, getTenantIdForInsert } from "@v1/lib/tenantQueryHelpers";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@v1/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@v1/components/ui/dialog";
import { Slider } from "@v1/components/ui/slider";
import { supabase } from "@v1/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Users, DollarSign, TrendingUp, Award, Power, Undo2, CheckCircle2, Banknote, Download, AlertTriangle, Crown, Calculator, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@v1/components/ui/progress";

function generateCode() {
  return "FJ" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function AdminAffiliates() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", affiliate_type: "regular" as string,
    first_payment_commission_percent: "20", recurring_commission_percent: "5",
  });

  // Simulator state
  const [sim, setSim] = useState({
    affiliates: 100, activeRate: 20, clientsPerAffiliate: 2,
    ticket: 79, retention: 85, firstCommission: 20, recurringCommission: 5,
  });

  const { data: affiliates = [] } = useQuery({
    queryKey: ["admin-affiliates", tenantId],
    queryFn: async () => {
      const q = supabase.from("affiliates").select("*").order("created_at", { ascending: false });
      const { data, error } = await withTenantFilter(q, tenantId);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allCommissions = [] } = useQuery({
    queryKey: ["admin-all-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliate_commissions").select("*, affiliates(full_name, referral_code)").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: riskFlags = [] } = useQuery({
    queryKey: ["admin-risk-flags"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("affiliate_risk_flags").select("*, affiliates(full_name, referral_code)").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allReferrals = [] } = useQuery({
    queryKey: ["admin-all-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliate_referrals").select("*, affiliates(full_name, referral_code)").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allPayouts = [] } = useQuery({
    queryKey: ["admin-all-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliate_payouts").select("*, affiliates(full_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: metricsCache = [] } = useQuery({
    queryKey: ["admin-affiliate-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliate_metrics_cache").select("*, affiliates(full_name, referral_code, affiliate_type)").order("total_earnings", { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const createAffiliate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("affiliates").insert([{
        full_name: form.full_name, email: form.email, referral_code: generateCode(),
        affiliate_type: form.affiliate_type as any,
        first_payment_commission_percent: parseFloat(form.first_payment_commission_percent),
        recurring_commission_percent: parseFloat(form.recurring_commission_percent),
        ...getTenantIdForInsert(tenantId),
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Embaixador criado!");
      qc.invalidateQueries({ queryKey: ["admin-affiliates"] });
      setCreateOpen(false);
      setForm({ full_name: "", email: "", affiliate_type: "regular", first_payment_commission_percent: "20", recurring_commission_percent: "5" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("affiliates").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["admin-affiliates"] }); },
  });

  const updateCommissionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === "paid") update.paid_at = new Date().toISOString();
      const { error } = await supabase.from("affiliate_commissions").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Comissão atualizada"); qc.invalidateQueries({ queryKey: ["admin-all-commissions"] }); },
  });

  const totalPending = allCommissions.filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + Number(c.commission_amount), 0);
  const totalApproved = allCommissions.filter((c: any) => c.status === "approved").reduce((s: number, c: any) => s + Number(c.commission_amount), 0);
  const totalPaid = allCommissions.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + Number(c.commission_amount), 0);
  const totalGrossAll = allCommissions.reduce((s: number, c: any) => s + Number(c.gross_amount), 0);
  const unresolvedFlags = riskFlags.filter((f: any) => !f.resolved).length;
  const activeAffiliates = affiliates.filter((a: any) => a.is_active).length;

  const exportCSV = () => {
    const rows = [["Embaixador","Tipo","Venda Bruta","Comissão %","Comissão R$","Status","Data"]];
    allCommissions.forEach((c: any) => {
      rows.push([c.affiliates?.full_name || "", c.commission_type === "first_payment" ? "1a Venda" : "Recorrente",
        Number(c.gross_amount).toFixed(2), Number(c.commission_percent).toFixed(0), Number(c.commission_amount).toFixed(2),
        c.status, format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })]);
    });
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `comissoes_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  const batchApprove = async () => {
    const pendingIds = allCommissions.filter((c: any) => c.status === "pending").map((c: any) => c.id);
    if (pendingIds.length === 0) { toast.info("Nenhuma comissão pendente"); return; }
    for (const id of pendingIds) {
      await supabase.from("affiliate_commissions").update({ status: "approved" }).eq("id", id);
    }
    qc.invalidateQueries({ queryKey: ["admin-all-commissions"] });
    toast.success(`${pendingIds.length} comissões aprovadas!`);
  };

  // Simulator calculations
  const simActiveAffiliates = Math.round(sim.affiliates * (sim.activeRate / 100));
  const simNewClientsMonth = simActiveAffiliates * sim.clientsPerAffiliate;
  const simRevenueMonth1 = simNewClientsMonth * sim.ticket;
  const simFirstCommission = simRevenueMonth1 * (sim.firstCommission / 100);
  const simNetMonth1 = simRevenueMonth1 - simFirstCommission;

  // 6-month projection
  const simProjection = Array.from({ length: 6 }, (_, month) => {
    const retained = Math.round(simNewClientsMonth * Math.pow(sim.retention / 100, month));
    const cumulative = Array.from({ length: month + 1 }, (_, m) => Math.round(simNewClientsMonth * Math.pow(sim.retention / 100, m))).reduce((a, b) => a + b, 0);
    const revenue = cumulative * sim.ticket;
    const recCommission = revenue * (sim.recurringCommission / 100);
    const firstComm = simNewClientsMonth * sim.ticket * (sim.firstCommission / 100);
    return { month: month + 1, newClients: simNewClientsMonth, retained, cumulative, revenue, firstComm, recCommission, net: revenue - recCommission - (month === 0 ? firstComm : firstComm) };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🏆 Gestão de Embaixadores</h1>
            <p className="text-muted-foreground text-sm">Controle completo do programa de afiliados</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-black"><Plus className="w-4 h-4 mr-1" /> Novo Embaixador</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Embaixador</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nome</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" /></div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.affiliate_type} onValueChange={(v) => setForm({ ...form, affiliate_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="nutritionist">Nutricionista</SelectItem>
                      <SelectItem value="premium_ambassador">Embaixador Premium</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Comissão 1ª Venda (%)</Label><Input value={form.first_payment_commission_percent} onChange={(e) => setForm({ ...form, first_payment_commission_percent: e.target.value })} type="number" /></div>
                  <div><Label>Comissão Recorrente (%)</Label><Input value={form.recurring_commission_percent} onChange={(e) => setForm({ ...form, recurring_commission_percent: e.target.value })} type="number" /></div>
                </div>
                <Button className="w-full" onClick={() => createAffiliate.mutate()} disabled={!form.full_name || !form.email}>Criar Embaixador</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card><CardContent className="pt-4 pb-4 text-center">
            <Users className="w-5 h-5 mx-auto text-blue-400 mb-1" />
            <p className="text-xl font-bold">{affiliates.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Embaixadores</p>
          </CardContent></Card>
          <Card className="border-emerald-500/20"><CardContent className="pt-4 pb-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
            <p className="text-xl font-bold">{activeAffiliates}</p>
            <p className="text-[10px] text-muted-foreground">Ativos</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center">
            <Award className="w-5 h-5 mx-auto text-violet-400 mb-1" />
            <p className="text-xl font-bold">{allReferrals.length}</p>
            <p className="text-[10px] text-muted-foreground">Indicações</p>
          </CardContent></Card>
          <Card className="border-yellow-500/20"><CardContent className="pt-4 pb-4 text-center">
            <DollarSign className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
            <p className="text-xl font-bold">R$ {totalPending.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">Pendentes</p>
          </CardContent></Card>
          <Card className="border-emerald-500/20"><CardContent className="pt-4 pb-4 text-center">
            <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
            <p className="text-xl font-bold">R$ {totalApproved.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">Aprovadas</p>
          </CardContent></Card>
          <Card className="border-green-500/20"><CardContent className="pt-4 pb-4 text-center">
            <Banknote className="w-5 h-5 mx-auto text-green-400 mb-1" />
            <p className="text-xl font-bold">R$ {totalPaid.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">Pagas</p>
          </CardContent></Card>
        </div>

        {/* Revenue overview bar */}
        <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent">
          <CardContent className="pt-4 pb-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground">Receita bruta gerada por afiliados</p>
              <p className="text-3xl font-bold text-amber-400">R$ {totalGrossAll.toFixed(2)}</p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-muted-foreground">Total comissões pagas + aprovadas</p>
              <p className="text-3xl font-bold text-emerald-400">R$ {(totalPaid + totalApproved).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="affiliates" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="affiliates">Embaixadores ({affiliates.length})</TabsTrigger>
            <TabsTrigger value="ranking">🏆 Ranking</TabsTrigger>
            <TabsTrigger value="referrals">Indicações ({allReferrals.length})</TabsTrigger>
            <TabsTrigger value="commissions">Comissões ({allCommissions.length})</TabsTrigger>
            <TabsTrigger value="payouts">Pagamentos ({allPayouts.length})</TabsTrigger>
            <TabsTrigger value="simulator">📊 Simulador</TabsTrigger>
            <TabsTrigger value="risk" className="gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Fraude ({unresolvedFlags})</TabsTrigger>
          </TabsList>

          {/* Affiliates */}
          <TabsContent value="affiliates">
            <Card><CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Código</TableHead><TableHead>Tipo</TableHead><TableHead>1ª / Rec.</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {affiliates.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.full_name}</TableCell>
                      <TableCell className="text-sm">{a.email}</TableCell>
                      <TableCell className="font-mono text-amber-400">{a.referral_code}</TableCell>
                      <TableCell><Badge variant="outline">{a.affiliate_type}</Badge></TableCell>
                      <TableCell className="text-sm">{a.first_payment_commission_percent}% / {a.recurring_commission_percent}%</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={a.is_active ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-400"}>
                          {a.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => toggleActive.mutate({ id: a.id, is_active: a.is_active })}><Power className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          {/* Ranking */}
          <TabsContent value="ranking">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Crown className="w-5 h-5 text-amber-400" /> Ranking de Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metricsCache.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum dado de ranking ainda.</p>
                  ) : metricsCache.map((a: any, i: number) => {
                    const pos = i + 1;
                    const posIcon = pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : `#${pos}`;
                    return (
                      <div key={a.affiliate_id} className={`flex items-center gap-4 p-3 rounded-xl border ${pos <= 3 ? "border-amber-500/20 bg-amber-500/5" : "border-border/30"}`}>
                        <span className={`text-lg font-bold w-8 text-center ${pos <= 3 ? "text-xl" : "text-muted-foreground"}`}>{posIcon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{a.affiliates?.full_name || "Embaixador"}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.tier_name || "Bronze"} · {a.total_referrals || 0} indicações · {Number(a.conversion_rate || 0).toFixed(0)}% conv.
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-amber-400">R$ {Number(a.total_earnings || 0).toFixed(0)}</p>
                          <p className="text-[10px] text-muted-foreground">R$ {Number(a.monthly_earnings || 0).toFixed(0)}/mês</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referrals */}
          <TabsContent value="referrals">
            <Card><CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Embaixador</TableHead><TableHead>Email Indicado</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {allReferrals.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.affiliates?.full_name || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{r.referred_email}</TableCell>
                      <TableCell>{r.referred_type}</TableCell>
                      <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(r.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          {/* Commissions */}
          <TabsContent value="commissions">
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5"><Download className="w-4 h-4" /> Exportar CSV</Button>
              <Button variant="outline" size="sm" onClick={batchApprove} className="gap-1.5"><CheckCircle2 className="w-4 h-4" /> Aprovar todas pendentes</Button>
            </div>
            <Card><CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Embaixador</TableHead><TableHead>Tipo</TableHead><TableHead>Venda</TableHead><TableHead>%</TableHead><TableHead>Comissão</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {allCommissions.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.affiliates?.full_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={c.commission_type === "first_payment" ? "border-amber-500/30 text-amber-400" : ""}>
                          {c.commission_type === "first_payment" ? "1ª Venda" : "Recorrente"}
                        </Badge>
                      </TableCell>
                      <TableCell>R$ {Number(c.gross_amount).toFixed(2)}</TableCell>
                      <TableCell>{Number(c.commission_percent).toFixed(0)}%</TableCell>
                      <TableCell className="font-bold">R$ {Number(c.commission_amount).toFixed(2)}</TableCell>
                      <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                      <TableCell className="flex gap-1">
                        {c.status === "pending" && <Button variant="ghost" size="sm" onClick={() => updateCommissionStatus.mutate({ id: c.id, status: "approved" })} title="Aprovar"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></Button>}
                        {c.status === "approved" && <Button variant="ghost" size="sm" onClick={() => updateCommissionStatus.mutate({ id: c.id, status: "paid" })} title="Marcar Pago"><Banknote className="w-4 h-4 text-green-400" /></Button>}
                        {(c.status === "pending" || c.status === "approved") && <Button variant="ghost" size="sm" onClick={() => updateCommissionStatus.mutate({ id: c.id, status: "reversed" })} title="Reverter"><Undo2 className="w-4 h-4 text-red-400" /></Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          {/* Payouts */}
          <TabsContent value="payouts">
            <Card><CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Embaixador</TableHead><TableHead>Valor</TableHead><TableHead>Método</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {allPayouts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum pagamento registrado ainda.</TableCell></TableRow>
                  ) : allPayouts.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.affiliates?.full_name || "—"}</TableCell>
                      <TableCell className="font-bold">R$ {Number(p.total_amount).toFixed(2)}</TableCell>
                      <TableCell>{p.payout_method}</TableCell>
                      <TableCell><Badge variant="outline">{p.payout_status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          {/* Revenue Simulator */}
          <TabsContent value="simulator">
            <div className="space-y-6">
              <Card className="border-amber-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-amber-400" /> Simulador de Receita — Programa de Afiliados</CardTitle>
                  <p className="text-sm text-muted-foreground">Ajuste os parâmetros e veja a projeção de faturamento em tempo real</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Inputs */}
                    <div className="space-y-5">
                      <div>
                        <div className="flex justify-between mb-1"><Label className="text-sm">Total de Afiliados</Label><span className="text-sm font-bold text-amber-400">{sim.affiliates}</span></div>
                        <Slider value={[sim.affiliates]} onValueChange={([v]) => setSim({ ...sim, affiliates: v })} min={10} max={5000} step={10} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1"><Label className="text-sm">Taxa de Ativação (%)</Label><span className="text-sm font-bold text-amber-400">{sim.activeRate}%</span></div>
                        <Slider value={[sim.activeRate]} onValueChange={([v]) => setSim({ ...sim, activeRate: v })} min={5} max={80} step={1} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1"><Label className="text-sm">Clientes/Afiliado/Mês</Label><span className="text-sm font-bold text-amber-400">{sim.clientsPerAffiliate}</span></div>
                        <Slider value={[sim.clientsPerAffiliate]} onValueChange={([v]) => setSim({ ...sim, clientsPerAffiliate: v })} min={1} max={10} step={1} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1"><Label className="text-sm">Ticket Médio (R$)</Label><span className="text-sm font-bold text-amber-400">R$ {sim.ticket}</span></div>
                        <Slider value={[sim.ticket]} onValueChange={([v]) => setSim({ ...sim, ticket: v })} min={19} max={297} step={1} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1"><Label className="text-sm">Retenção Mensal (%)</Label><span className="text-sm font-bold text-emerald-400">{sim.retention}%</span></div>
                        <Slider value={[sim.retention]} onValueChange={([v]) => setSim({ ...sim, retention: v })} min={50} max={99} step={1} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between mb-1"><Label className="text-xs">1ª Venda (%)</Label><span className="text-xs font-bold">{sim.firstCommission}%</span></div>
                          <Slider value={[sim.firstCommission]} onValueChange={([v]) => setSim({ ...sim, firstCommission: v })} min={5} max={50} step={1} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1"><Label className="text-xs">Recorrente (%)</Label><span className="text-xs font-bold">{sim.recurringCommission}%</span></div>
                          <Slider value={[sim.recurringCommission]} onValueChange={([v]) => setSim({ ...sim, recurringCommission: v })} min={1} max={20} step={1} />
                        </div>
                      </div>
                    </div>

                    {/* Right: Results */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                          <p className="text-2xl font-bold text-blue-400">{simActiveAffiliates}</p>
                          <p className="text-[10px] text-muted-foreground">Afiliados Ativos</p>
                        </div>
                        <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-center">
                          <p className="text-2xl font-bold text-violet-400">{simNewClientsMonth}</p>
                          <p className="text-[10px] text-muted-foreground">Novos Clientes/Mês</p>
                        </div>
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                          <p className="text-2xl font-bold text-amber-400">R$ {simRevenueMonth1.toLocaleString("pt-BR")}</p>
                          <p className="text-[10px] text-muted-foreground">Receita Bruta Mês 1</p>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                          <p className="text-2xl font-bold text-emerald-400">R$ {simNetMonth1.toLocaleString("pt-BR")}</p>
                          <p className="text-[10px] text-muted-foreground">Receita Líquida Mês 1</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20">
                        <p className="text-xs text-muted-foreground mb-1">Projeção MRR Mês 6 (acumulado)</p>
                        <p className="text-3xl font-bold text-amber-400">R$ {simProjection[5]?.revenue.toLocaleString("pt-BR")}</p>
                        <p className="text-xs text-muted-foreground">com ~{simProjection[5]?.cumulative} clientes ativos</p>
                      </div>
                    </div>
                  </div>

                  {/* Projection Table */}
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="w-4 h-4 text-amber-400" /> Projeção 6 Meses</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead>Mês</TableHead><TableHead>Novos</TableHead><TableHead>Acumulado</TableHead><TableHead>Receita</TableHead><TableHead>Comissão 1ª</TableHead><TableHead>Comissão Rec.</TableHead><TableHead>Líquido</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {simProjection.map((p) => (
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
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Risk Flags */}
          <TabsContent value="risk">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Alertas Anti-Fraude</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Embaixador</TableHead><TableHead>Tipo</TableHead><TableHead>Severidade</TableHead><TableHead>Descrição</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {riskFlags.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">✅ Nenhum alerta de fraude detectado.</TableCell></TableRow>
                    ) : riskFlags.map((f: any) => (
                      <TableRow key={f.id}>
                        <TableCell>{f.affiliates?.full_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{f.flag_type}</Badge></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={f.severity === "critical" ? "border-red-500/30 text-red-400" : f.severity === "high" ? "border-orange-500/30 text-orange-400" : "border-yellow-500/30 text-yellow-400"}>{f.severity}</Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{f.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={f.resolved ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-400"}>{f.resolved ? "Resolvido" : "Pendente"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(f.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
