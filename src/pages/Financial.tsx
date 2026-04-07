import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, TrendingUp, Plus, CreditCard, ArrowUpCircle, ArrowDownCircle, Trash2, AlertTriangle, BarChart3, Pencil } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

const defaultTxForm = {
  id: null as string | null,
  type: "income" as "income" | "expense",
  description: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  category: "",
};

interface PatientPayment {
  id: string;
  patientName: string;
  planName: string;
  status: string;
  amount: number;
  gateway: string;
  createdAt: string;
  paidAt: string | null;
}

interface Transaction {
  id: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  date: string;
  category: string | null;
  status: string;
}

export default function Financial() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PatientPayment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txOpen, setTxOpen] = useState(false);
  const [txForm, setTxForm] = useState({ ...defaultTxForm });

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [patientsRes, txRes] = await Promise.all([
      supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", user.id)
        .eq("status", "active"),
      supabase
        .from("financial_transactions")
        .select("*")
        .eq("nutritionist_id", user.id)
        .order("date", { ascending: false }),
    ]);

    setTransactions((txRes.data as Transaction[]) || []);

    const patients = patientsRes.data;
    if (!patients?.length) {
      setLoading(false);
      return;
    }

    const patientIds = patients.map((p) => p.patient_id);

    const [paymentsRes, profilesRes] = await Promise.all([
      supabase.from("payments").select("*").in("user_id", patientIds).order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name").in("user_id", patientIds),
    ]);

    const profileMap = new Map(profilesRes.data?.map((p) => [p.user_id, p.full_name]) || []);

    const mapped: PatientPayment[] = (paymentsRes.data || []).map((p) => {
      const meta = p.metadata as Record<string, string> | null;
      return {
        id: p.id,
        patientName: profileMap.get(p.user_id) || "Paciente",
        planName: meta?.plan_name || p.gateway,
        status: p.status,
        amount: Number(p.amount),
        gateway: p.gateway,
        createdAt: p.created_at,
        paidAt: p.paid_at,
      };
    });

    setPayments(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const saveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      nutritionist_id: user.id,
      type: txForm.type,
      description: txForm.description.trim(),
      amount: parseFloat(txForm.amount),
      date: txForm.date,
      category: txForm.category.trim() || null,
    };

    if (txForm.id) {
      // Update existing
      const { error } = await supabase.from("financial_transactions").update(payload).eq("id", txForm.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Transação atualizada!");
    } else {
      // Insert new
      const { error } = await supabase.from("financial_transactions").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Transação adicionada!");
    }

    setTxOpen(false);
    setTxForm({ ...defaultTxForm });
    fetchData();
  };

  const editTransaction = (tx: Transaction) => {
    setTxForm({
      id: tx.id,
      type: tx.type,
      description: tx.description,
      amount: String(tx.amount),
      date: tx.date,
      category: tx.category || "",
    });
    setTxOpen(true);
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Transação removida!");
      fetchData();
    }
  };

  const paidPayments = payments.filter((p) => p.status === "paid" || p.status === "approved");
  const totalPaid = paidPayments.length;
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const paymentRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  const incomeTotal = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = incomeTotal - expenseTotal;

  // Chart data: monthly income vs expense (last 6 months)
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; receitas: number; despesas: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      months[key] = { month: label, receitas: 0, despesas: 0 };
    }
    transactions.forEach((tx) => {
      const key = tx.date.substring(0, 7);
      if (months[key]) {
        if (tx.type === "income") months[key].receitas += tx.amount;
        else months[key].despesas += tx.amount;
      }
    });
    return Object.values(months);
  }, [transactions]);

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions.forEach((tx) => {
      const cat = tx.category || (tx.type === "income" ? "Receita geral" : "Despesa geral");
      cats[cat] = (cats[cat] || 0) + tx.amount;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const PIE_COLORS = ["hsl(160, 84%, 39%)", "hsl(45, 93%, 47%)", "hsl(0, 84%, 60%)", "hsl(200, 80%, 50%)", "hsl(280, 70%, 50%)"];
  const statusColors: Record<string, string> = {
    paid: "bg-emerald-500/10 text-emerald-500",
    approved: "bg-emerald-500/10 text-emerald-500",
    pending: "bg-amber-500/10 text-amber-500",
    failed: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };

  const statusLabels: Record<string, string> = {
    paid: "Pago",
    approved: "Aprovado",
    pending: "Pendente",
    failed: "Falhou",
    cancelled: "Cancelado",
  };

  // Payment status breakdown
  const paymentStatusData = useMemo(() => {
    const statuses: Record<string, number> = {};
    payments.forEach((p) => {
      const label = statusLabels[p.status] || p.status;
      statuses[label] = (statuses[label] || 0) + 1;
    });
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [payments, statusLabels]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <DollarSign className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Financeiro</h1>
              <p className="text-sm text-muted-foreground">Gestão de planos, receitas e despesas</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setTxForm({ ...defaultTxForm, type: "expense" }); setTxOpen(true); }} className="gap-1">
              <ArrowDownCircle className="w-4 h-4" /> Despesa
            </Button>
            <Button size="sm" onClick={() => { setTxForm({ ...defaultTxForm, type: "income" }); setTxOpen(true); }} className="gap-1 gradient-primary">
              <Plus className="w-4 h-4" /> Receita
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Alert for pending payments */}
            {pendingPayments.length > 0 && (
              <Card className="border-amber-500/50 bg-amber-500/5">
                <CardContent className="flex items-start gap-3 py-4">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Pagamentos pendentes</p>
                    {pendingPayments.map((p) => (
                      <p key={p.id} className="text-xs text-muted-foreground">
                        {p.patientName} — {p.planName} • R$ {p.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="glass shadow-card">
                <CardContent className="flex items-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display">{totalPaid}</p>
                    <p className="text-sm text-muted-foreground">Pagamentos Confirmados</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass shadow-card">
                <CardContent className="flex items-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <ArrowUpCircle className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display text-emerald-500">
                      R$ {incomeTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">Receitas</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass shadow-card">
                <CardContent className="flex items-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <ArrowDownCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display text-red-500">
                      R$ {expenseTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">Despesas</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass shadow-card">
                <CardContent className="flex items-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold font-display ${balance >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">Saldo</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Monthly Bar Chart */}
              <Card className="glass shadow-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Receitas vs Despesas (6 meses)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                      />
                      <Legend />
                      <Bar dataKey="receitas" name="Receitas" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="despesas" name="Despesas" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Pie Chart */}
              <Card className="glass shadow-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Distribuição por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryData.length === 0 ? (
                    <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                      Nenhuma transação registrada
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {categoryData.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Balance Line Chart */}
              <Card className="glass shadow-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Evolução do Saldo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={monthlyData.map((m) => ({ ...m, saldo: m.receitas - m.despesas }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                      />
                      <Line type="monotone" dataKey="saldo" name="Saldo" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Payment Status Pie */}
              <Card className="glass shadow-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Status dos Pagamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentStatusData.length === 0 ? (
                    <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                      Nenhum pagamento registrado
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={paymentStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {paymentStatusData.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="subscriptions" className="w-full">
              <TabsList className="w-full justify-start bg-card border border-border flex-wrap">
                <TabsTrigger value="subscriptions">Pagamentos</TabsTrigger>
                <TabsTrigger value="stripe-income">
                  <CreditCard className="w-3.5 h-3.5 mr-1" /> Receitas Stripe
                </TabsTrigger>
                <TabsTrigger value="manual-income">
                  <ArrowUpCircle className="w-3.5 h-3.5 mr-1" /> Receitas Manuais
                </TabsTrigger>
                <TabsTrigger value="expenses">
                  <ArrowDownCircle className="w-3.5 h-3.5 mr-1" /> Despesas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="subscriptions" className="mt-4">
                <Card className="glass shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display text-lg">Pagamentos dos Pacientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {payments.length === 0 ? (
                      <div className="text-center py-8">
                        <DollarSign className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Nenhum pagamento encontrado</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {payments.map((pay) => (
                          <div key={pay.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-bold text-primary">
                                  {pay.patientName[0]?.toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-sm">{pay.patientName}</p>
                                <p className="text-xs text-muted-foreground">{pay.planName} • {pay.gateway}</p>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-3">
                              <div>
                                <Badge className={statusColors[pay.status] || "bg-muted text-muted-foreground"}>
                                  {statusLabels[pay.status] || pay.status}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  R$ {pay.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(pay.createdAt).toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Stripe Income Tab */}
              <TabsContent value="stripe-income" className="mt-4">
                <TransactionList
                  transactions={transactions.filter((t) => t.type === "income" && t.category === "assinatura")}
                  type="income"
                  label="Receitas Stripe"
                  emptyMessage="Nenhuma receita via Stripe registrada"
                  icon={<CreditCard className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />}
                  onAdd={() => { setTxForm({ ...defaultTxForm, type: "income", category: "assinatura" }); setTxOpen(true); }}
                  onEdit={editTransaction}
                  onDelete={deleteTransaction}
                />
              </TabsContent>

              {/* Manual Income Tab */}
              <TabsContent value="manual-income" className="mt-4">
                <TransactionList
                  transactions={transactions.filter((t) => t.type === "income" && t.category !== "assinatura")}
                  type="income"
                  label="Receitas Manuais"
                  emptyMessage="Nenhuma receita manual registrada"
                  onAdd={() => { setTxForm({ ...defaultTxForm, type: "income" }); setTxOpen(true); }}
                  onEdit={editTransaction}
                  onDelete={deleteTransaction}
                />
              </TabsContent>

              <TabsContent value="expenses" className="mt-4">
                <TransactionList
                  transactions={transactions.filter((t) => t.type === "expense")}
                  type="expense"
                  onAdd={() => { setTxForm({ ...defaultTxForm, type: "expense" }); setTxOpen(true); }}
                  onEdit={editTransaction}
                  onDelete={deleteTransaction}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={txOpen} onOpenChange={setTxOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {txForm.id ? "Editar Transação" : (txForm.type === "income" ? "Nova Receita" : "Nova Despesa")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={saveTransaction} className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={txForm.type} onValueChange={(v) => setTxForm({ ...txForm, type: v as "income" | "expense" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">💰 Receita</SelectItem>
                  <SelectItem value="expense">💸 Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} placeholder="Ex: Consulta paciente X" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" min="0" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} required />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })} required />
              </div>
            </div>
            <div>
              <Label>Categoria (opcional)</Label>
              <Input value={txForm.category} onChange={(e) => setTxForm({ ...txForm, category: e.target.value })} placeholder="Ex: Consultoria, Material, Aluguel" />
            </div>
            <Button type="submit" className="w-full gradient-primary">Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function TransactionList({
  transactions,
  type,
  label,
  emptyMessage,
  icon,
  onAdd,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  type: "income" | "expense";
  label?: string;
  emptyMessage?: string;
  icon?: React.ReactNode;
  onAdd: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  const isIncome = type === "income";
  const title = label || (isIncome ? "Receitas" : "Despesas");
  return (
    <Card className="glass shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-lg">
          {title}
        </CardTitle>
        <Button size="sm" onClick={onAdd} className="gap-1">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            {icon || (isIncome ? (
              <ArrowUpCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            ) : (
              <ArrowDownCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            ))}
            <p className="text-sm text-muted-foreground">
              {emptyMessage || `Nenhuma ${isIncome ? "receita" : "despesa"} registrada`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isIncome ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    {isIncome ? (
                      <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ArrowDownCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString("pt-BR")}
                      {tx.category && ` • ${tx.category}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`font-bold text-sm ${isIncome ? "text-emerald-500" : "text-red-500"}`}>
                    R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(tx)}>
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(tx.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
