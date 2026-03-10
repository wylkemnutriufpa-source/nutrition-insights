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
import { DollarSign, TrendingUp, Plus, CreditCard, ArrowUpCircle, ArrowDownCircle, Trash2, AlertTriangle, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

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
  const [txForm, setTxForm] = useState({
    type: "income" as "income" | "expense",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "",
  });

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

  const addTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from("financial_transactions").insert({
      nutritionist_id: user.id,
      type: txForm.type,
      description: txForm.description,
      amount: parseFloat(txForm.amount),
      date: txForm.date,
      category: txForm.category || null,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Transação adicionada!");
    setTxOpen(false);
    setTxForm({ type: "income", description: "", amount: "", date: new Date().toISOString().split("T")[0], category: "" });
    fetchData();
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <DollarSign className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Financeiro</h1>
            <p className="text-sm text-muted-foreground">Gestão de planos, receitas e despesas</p>
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

            <Tabs defaultValue="subscriptions" className="w-full">
              <TabsList className="w-full justify-start bg-card border border-border">
                <TabsTrigger value="subscriptions">Pagamentos</TabsTrigger>
                <TabsTrigger value="income">
                  <ArrowUpCircle className="w-3.5 h-3.5 mr-1" /> Receitas
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

              {/* Income Tab */}
              <TabsContent value="income" className="mt-4">
                <TransactionList
                  transactions={transactions.filter((t) => t.type === "income")}
                  type="income"
                  onAdd={() => { setTxForm({ ...txForm, type: "income" }); setTxOpen(true); }}
                  onDelete={deleteTransaction}
                />
              </TabsContent>

              {/* Expenses Tab */}
              <TabsContent value="expenses" className="mt-4">
                <TransactionList
                  transactions={transactions.filter((t) => t.type === "expense")}
                  type="expense"
                  onAdd={() => { setTxForm({ ...txForm, type: "expense" }); setTxOpen(true); }}
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
              {txForm.type === "income" ? "Nova Receita" : "Nova Despesa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={addTransaction} className="space-y-4">
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
  onAdd,
  onDelete,
}: {
  transactions: Transaction[];
  type: "income" | "expense";
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const isIncome = type === "income";
  return (
    <Card className="glass shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-lg">
          {isIncome ? "Receitas" : "Despesas"}
        </CardTitle>
        <Button size="sm" onClick={onAdd} className="gap-1">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            {isIncome ? (
              <ArrowUpCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            ) : (
              <ArrowDownCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            )}
            <p className="text-sm text-muted-foreground">
              Nenhuma {isIncome ? "receita" : "despesa"} registrada
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
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${isIncome ? "text-emerald-500" : "text-red-500"}`}>
                    R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
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
