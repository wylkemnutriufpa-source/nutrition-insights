import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Users, DollarSign, TrendingUp, Award, Edit2, Power, Eye, Undo2, CheckCircle2, Banknote, Download, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function generateCode() {
  return "FJ" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function AdminAffiliates() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    affiliate_type: "regular" as string,
    first_payment_commission_percent: "20",
    recurring_commission_percent: "5",
  });

  const { data: affiliates = [] } = useQuery({
    queryKey: ["admin-affiliates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allCommissions = [] } = useQuery({
    queryKey: ["admin-all-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_commissions")
        .select("*, affiliates(full_name, referral_code)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: riskFlags = [] } = useQuery({
    queryKey: ["admin-risk-flags"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("affiliate_risk_flags")
        .select("*, affiliates(full_name, referral_code)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allReferrals = [] } = useQuery({
    queryKey: ["admin-all-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_referrals")
        .select("*, affiliates(full_name, referral_code)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allPayouts = [] } = useQuery({
    queryKey: ["admin-all-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_payouts")
        .select("*, affiliates(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createAffiliate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("affiliates").insert([{
        full_name: form.full_name,
        email: form.email,
        referral_code: generateCode(),
        affiliate_type: form.affiliate_type as any,
        first_payment_commission_percent: parseFloat(form.first_payment_commission_percent),
        recurring_commission_percent: parseFloat(form.recurring_commission_percent),
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
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["admin-affiliates"] });
    },
  });

  const updateCommissionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === "paid") update.paid_at = new Date().toISOString();
      const { error } = await supabase.from("affiliate_commissions").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comissão atualizada");
      qc.invalidateQueries({ queryKey: ["admin-all-commissions"] });
    },
  });

  const totalPending = allCommissions.filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + Number(c.commission_amount), 0);
  const totalApproved = allCommissions.filter((c: any) => c.status === "approved").reduce((s: number, c: any) => s + Number(c.commission_amount), 0);
  const totalPaid = allCommissions.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + Number(c.commission_amount), 0);
  const unresolvedFlags = riskFlags.filter((f: any) => !f.resolved).length;

  const exportCSV = () => {
    const rows = [["Embaixador","Tipo","Venda Bruta","Comissão %","Comissão R$","Status","Data"]];
    allCommissions.forEach((c: any) => {
      rows.push([
        c.affiliates?.full_name || "",
        c.commission_type === "first_payment" ? "1a Venda" : "Recorrente",
        Number(c.gross_amount).toFixed(2),
        Number(c.commission_percent).toFixed(0),
        Number(c.commission_amount).toFixed(2),
        c.status,
        format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR }),
      ]);
    });
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comissoes_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
  const totalPaid = allCommissions.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + Number(c.commission_amount), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🏆 Gestão de Embaixadores</h1>
            <p className="text-muted-foreground text-sm">Programa de Embaixadores FitJourney</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-black">
                <Plus className="w-4 h-4 mr-1" /> Novo Embaixador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Embaixador</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" />
                </div>
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
                  <div>
                    <Label>Comissão 1ª Venda (%)</Label>
                    <Input value={form.first_payment_commission_percent} onChange={(e) => setForm({ ...form, first_payment_commission_percent: e.target.value })} type="number" />
                  </div>
                  <div>
                    <Label>Comissão Recorrente (%)</Label>
                    <Input value={form.recurring_commission_percent} onChange={(e) => setForm({ ...form, recurring_commission_percent: e.target.value })} type="number" />
                  </div>
                </div>
                <Button className="w-full" onClick={() => createAffiliate.mutate()} disabled={!form.full_name || !form.email}>
                  Criar Embaixador
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Users className="w-6 h-6 mx-auto text-blue-400 mb-1" />
              <p className="text-2xl font-bold">{affiliates.length}</p>
              <p className="text-xs text-muted-foreground">Embaixadores</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/20">
            <CardContent className="pt-4 pb-4 text-center">
              <DollarSign className="w-6 h-6 mx-auto text-yellow-400 mb-1" />
              <p className="text-2xl font-bold">R$ {totalPending.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20">
            <CardContent className="pt-4 pb-4 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-400 mb-1" />
              <p className="text-2xl font-bold">R$ {totalApproved.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Aprovadas</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/20">
            <CardContent className="pt-4 pb-4 text-center">
              <Banknote className="w-6 h-6 mx-auto text-green-400 mb-1" />
              <p className="text-2xl font-bold">R$ {totalPaid.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Pagas</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="affiliates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="affiliates">Embaixadores ({affiliates.length})</TabsTrigger>
            <TabsTrigger value="referrals">Indicações ({allReferrals.length})</TabsTrigger>
            <TabsTrigger value="commissions">Comissões ({allCommissions.length})</TabsTrigger>
            <TabsTrigger value="payouts">Pagamentos ({allPayouts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="affiliates">
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>1ª / Rec.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affiliates.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.full_name}</TableCell>
                        <TableCell className="text-sm">{a.email}</TableCell>
                        <TableCell className="font-mono text-amber-400">{a.referral_code}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{a.affiliate_type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{a.first_payment_commission_percent}% / {a.recurring_commission_percent}%</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={a.is_active ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-400"}>
                            {a.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive.mutate({ id: a.id, is_active: a.is_active })}
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals">
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Embaixador</TableHead>
                      <TableHead>Email Indicado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allReferrals.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.affiliates?.full_name || "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{r.referred_email}</TableCell>
                        <TableCell>{r.referred_type}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(r.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commissions">
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Embaixador</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Venda</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
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
                        <TableCell>
                          <Badge variant="outline">{c.status}</Badge>
                        </TableCell>
                        <TableCell className="flex gap-1">
                          {c.status === "pending" && (
                            <Button variant="ghost" size="sm" onClick={() => updateCommissionStatus.mutate({ id: c.id, status: "approved" })} title="Aprovar">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </Button>
                          )}
                          {c.status === "approved" && (
                            <Button variant="ghost" size="sm" onClick={() => updateCommissionStatus.mutate({ id: c.id, status: "paid" })} title="Marcar Pago">
                              <Banknote className="w-4 h-4 text-green-400" />
                            </Button>
                          )}
                          {(c.status === "pending" || c.status === "approved") && (
                            <Button variant="ghost" size="sm" onClick={() => updateCommissionStatus.mutate({ id: c.id, status: "reversed" })} title="Reverter">
                              <Undo2 className="w-4 h-4 text-red-400" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Embaixador</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPayouts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum pagamento registrado ainda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      allPayouts.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.affiliates?.full_name || "—"}</TableCell>
                          <TableCell className="font-bold">R$ {Number(p.total_amount).toFixed(2)}</TableCell>
                          <TableCell>{p.payout_method}</TableCell>
                          <TableCell><Badge variant="outline">{p.payout_status}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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
