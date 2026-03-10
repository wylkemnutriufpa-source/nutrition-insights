import { useEffect, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, Users, TrendingUp, Plus, CreditCard, ArrowUpCircle, ArrowDownCircle, Trash2, AlertTriangle, Pencil, Filter } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = {
  income: ['Mensalidade', 'Consulta avulsa', 'Plano trimestral', 'Plano semestral', 'Plano anual', 'Outro'],
  expense: ['Aluguel', 'Material', 'Software', 'Cursos', 'Marketing', 'Transporte', 'Alimentação', 'Outro'],
};

const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);


interface PatientSub {
  id: string;
  patientName: string;
  planName: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
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
  const [subs, setSubs] = useState<PatientSub[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txOpen, setTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [filterYear] = useState(now.getFullYear());
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

    const [subsRes, profilesRes] = await Promise.all([
      supabase.from("subscriptions").select("*").in("user_id", patientIds),
      supabase.from("profiles").select("user_id, full_name").in("user_id", patientIds),
    ]);

    const profileMap = new Map(profilesRes.data?.map((p) => [p.user_id, p.full_name]) || []);

    const mapped: PatientSub[] = (subsRes.data || []).map((s) => ({
      id: s.id,
      patientName: profileMap.get(s.user_id) || "Paciente",
      planName: s.plan_name,
      status: s.status,
      startedAt: s.started_at,
      expiresAt: s.expires_at,
    }));

    setSubs(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const addTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (editingTx) {
      // Update existing
      const { error } = await supabase.from("financial_transactions").update({
        type: txForm.type,
        description: txForm.description,
        amount: parseFloat(txForm.amount),
        date: txForm.date,
        category: txForm.category || null,
      }).eq("id", editingTx.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Transação atualizada!");
    } else {
      const { error } = await supabase.from("financial_transactions").insert({
        nutritionist_id: user.id,
        type: txForm.type,
        description: txForm.description,
        amount: parseFloat(txForm.amount),
        date: txForm.date,
        category: txForm.category || null,
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Transação adicionada!");
    }
    setTxOpen(false);
    setEditingTx(null);
    setTxForm({ type: "income", description: "", amount: "", date: new Date().toISOString().split("T")[0], category: "" });
    fetchData();
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setTxForm({ type: tx.type, description: tx.description, amount: String(tx.amount), date: tx.date, category: tx.category || "" });
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

  const activeSubs = subs.filter((s) => s.status === "active");
  const totalActive = activeSubs.length;

  // Filter by selected month
  const filteredTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  // Subs expiring in 7 days
  const expiringAlert = subs.filter((s) => {
    if (!s.expiresAt || s.status !== "active") return false;
    const days = Math.ceil((new Date(s.expiresAt).getTime() - Date.now()) / 86400000);
    return days > 0 && days <= 7;
  });

  const incomeTotal = filteredTx.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = filteredTx.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = incomeTotal - expenseTotal;

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-500",
    expired: "bg-red-500/10 text-red-500",
    cancelled: "bg-muted text-muted-foreground",
    trial: "bg-blue-500/10 text-blue-500",
  };

  const statusLabels: Record<string, string> = {
    active: "Ativo",
    expired: "Expirado",
    cancelled: "Cancelado",
    trial: "Trial",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <DollarSign className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Financeiro</h1>
              <p className="text-sm text-muted-foreground">Gestão de planos, receitas e despesas</p>
            </div>
          </div>
          {/* Month filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={String(filterMonth)} onValueChange={v => setFilterMonth(Number(v))}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS_PT.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{filterYear}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Alert for expiring subscriptions */}
            {expiringAlert.length > 0 && (
              <Card className="border-warning/50 bg-warning/5">
                <CardContent className="flex items-start gap-3 py-4">
                  <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Mensalidades vencendo em breve</p>
                    {expiringAlert.map((s) => {
                      const days = Math.ceil((new Date(s.expiresAt!).getTime() - Date.now()) / 86400000);
                      return (
                        <p key={s.id} className="text-xs text-muted-foreground">
                          {s.patientName} — {s.planName} vence em {days} dia{days > 1 ? "s" : ""}
                        </p>
                      );
                    })}
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
                    <p className="text-2xl font-bold font-display">{totalActive}</p>
                    <p className="text-sm text-muted-foreground">Assinaturas Ativas</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass shadow-card">
                <CardContent className="flex items-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <ArrowUpCircle className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display text-emerald-500">{formatBRL(incomeTotal)}</p>
                    <p className="text-sm text-muted-foreground">Receitas ({MONTHS_PT[filterMonth]})</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass shadow-card">
                <CardContent className="flex items-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <ArrowDownCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display text-red-500">{formatBRL(expenseTotal)}</p>
                    <p className="text-sm text-muted-foreground">Despesas ({MONTHS_PT[filterMonth]})</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass shadow-card">
                <CardContent className="flex items-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold font-display ${balance >= 0 ? "text-emerald-500" : "text-red-500"}`}>{formatBRL(balance)}</p>
                    <p className="text-sm text-muted-foreground">Saldo do Mês</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="subscriptions" className="w-full">
              <TabsList className="w-full justify-start bg-card border border-border">
                <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
                <TabsTrigger value="income">
                  <ArrowUpCircle className="w-3.5 h-3.5 mr-1" /> Receitas
                </TabsTrigger>
                <TabsTrigger value="expenses">
                  <ArrowDownCircle className="w-3.5 h-3.5 mr-1" /> Despesas
                </TabsTrigger>
              </TabsList>

              {/* Subscriptions Tab */}
              <TabsContent value="subscriptions" className="mt-4">
                <Card className="glass shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display text-lg">Assinaturas dos Pacientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {subs.length === 0 ? (
                      <div className="text-center py-8">
                        <DollarSign className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Nenhuma assinatura encontrada</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {subs.map((sub) => {
                          const daysLeft = sub.expiresAt
                            ? Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 86400000)
                            : null;
                          return (
                            <div key={sub.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-bold text-primary">
                                    {sub.patientName[0]?.toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{sub.patientName}</p>
                                  <p className="text-xs text-muted-foreground">{sub.planName}</p>
                                </div>
                              </div>
                              <div className="text-right flex items-center gap-3">
                                <div>
                                  <Badge className={statusColors[sub.status] || "bg-muted text-muted-foreground"}>
                                    {statusLabels[sub.status] || sub.status}
                                  </Badge>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Início: {new Date(sub.startedAt).toLocaleDateString("pt-BR")}
                                  </p>
                                  {daysLeft !== null && daysLeft > 0 && daysLeft <= 7 && (
                                    <p className="text-xs text-warning font-medium mt-0.5">
                                      ⚠️ Vence em {daysLeft} dia{daysLeft > 1 ? "s" : ""}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Income Tab */}
              <TabsContent value="income" className="mt-4">
                <TransactionList
                  transactions={filteredTx.filter((t) => t.type === "income")}
                  type="income"
                  onAdd={() => { setEditingTx(null); setTxForm({ ...txForm, type: "income", category: "" }); setTxOpen(true); }}
                  onDelete={deleteTransaction}
                  onEdit={openEdit}
                />
              </TabsContent>

              {/* Expenses Tab */}
              <TabsContent value="expenses" className="mt-4">
                <TransactionList
                  transactions={filteredTx.filter((t) => t.type === "expense")}
                  type="expense"
                  onAdd={() => { setEditingTx(null); setTxForm({ ...txForm, type: "expense", category: "" }); setTxOpen(true); }}
                  onDelete={deleteTransaction}
                  onEdit={openEdit}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Add/Edit Transaction Dialog */}
      <Dialog open={txOpen} onOpenChange={(v) => { setTxOpen(v); if (!v) setEditingTx(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingTx ? "Editar" : txForm.type === "income" ? "Nova Receita" : "Nova Despesa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={addTransaction} className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={txForm.type} onValueChange={(v) => setTxForm({ ...txForm, type: v as "income" | "expense", category: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">💰 Receita</SelectItem>
                  <SelectItem value="expense">💸 Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={txForm.category} onValueChange={(v) => setTxForm({ ...txForm, category: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES[txForm.type].map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
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
            <Button type="submit" className="w-full gradient-primary">{editingTx ? "Salvar Alterações" : "Salvar"}</Button>
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
  onEdit,
}: {
  transactions: Transaction[];
  type: "income" | "expense";
  onAdd: () => void;
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
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
                    {formatBRL(tx.amount)}
                  </span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(tx)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
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
