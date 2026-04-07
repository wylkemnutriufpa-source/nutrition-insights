import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
import { Progress } from "@/components/ui/progress";
import {
  DollarSign, TrendingUp, Plus, CreditCard, ArrowUpCircle, ArrowDownCircle,
  Trash2, AlertTriangle, BarChart3, Pencil, Download, Filter, Search,
  Target, Bell, ChevronLeft, ChevronRight, ArrowUpDown, X, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

// ── Types ──
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

// ── Animated Counter ──
function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [displayed, setDisplayed] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const duration = 800;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    prevRef.current = end;
  }, [value]);

  return (
    <span>
      {prefix}{displayed.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

// ── Constants ──
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

const MONTHS_FILTER = [
  { label: "Este mês", value: "current" },
  { label: "Último mês", value: "last" },
  { label: "3 meses", value: "3m" },
  { label: "6 meses", value: "6m" },
  { label: "Este ano", value: "year" },
  { label: "Todos", value: "all" },
];

// ── Export helpers ──
function exportCSV(data: any[], filename: string) {
  if (!data.length) { toast.error("Nenhum dado para exportar"); return; }
  const keys = Object.keys(data[0]);
  const csv = [keys.join(","), ...data.map(row => keys.map(k => `"${row[k] ?? ""}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast.success("Relatório exportado!");
}

// ── Main Component ──
export default function Financial() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PatientPayment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txOpen, setTxOpen] = useState(false);
  const [txForm, setTxForm] = useState({ ...defaultTxForm });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState("6m");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Financial goal
  const [monthlyGoal, setMonthlyGoal] = useState(() => {
    const saved = localStorage.getItem("fj_financial_goal");
    return saved ? Number(saved) : 0;
  });
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const fetchData = useCallback(async () => {
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
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
      const { error } = await supabase.from("financial_transactions").update(payload).eq("id", txForm.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Transação atualizada!");
    } else {
      const { error } = await supabase.from("financial_transactions").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Transação adicionada!");
    }

    setTxOpen(false);
    setTxForm({ ...defaultTxForm });
    fetchData();
  };

  const editTransaction = (tx: Transaction) => {
    setTxForm({ id: tx.id, type: tx.type, description: tx.description, amount: String(tx.amount), date: tx.date, category: tx.category || "" });
    setTxOpen(true);
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Transação removida!"); fetchData(); }
  };

  const saveGoal = () => {
    const val = parseFloat(goalInput);
    if (isNaN(val) || val <= 0) { toast.error("Valor inválido"); return; }
    setMonthlyGoal(val);
    localStorage.setItem("fj_financial_goal", String(val));
    setGoalOpen(false);
    toast.success("Meta atualizada!");
  };

  // ── Period filtering ──
  const getDateRange = useCallback(() => {
    const now = new Date();
    const start = new Date();
    switch (periodFilter) {
      case "current": start.setDate(1); break;
      case "last": start.setMonth(now.getMonth() - 1); start.setDate(1); break;
      case "3m": start.setMonth(now.getMonth() - 3); break;
      case "6m": start.setMonth(now.getMonth() - 6); break;
      case "year": start.setMonth(0); start.setDate(1); break;
      default: return null;
    }
    return start.toISOString().split("T")[0];
  }, [periodFilter]);

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    const minDate = getDateRange();
    if (minDate) filtered = filtered.filter(t => t.date >= minDate);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(q) ||
        (t.category || "").toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [transactions, getDateRange, searchQuery]);

  const filteredPayments = useMemo(() => {
    let filtered = [...payments];
    const minDate = getDateRange();
    if (minDate) filtered = filtered.filter(p => p.createdAt >= minDate);
    if (statusFilter !== "all") filtered = filtered.filter(p => p.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.patientName.toLowerCase().includes(q) ||
        p.planName.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [payments, getDateRange, statusFilter, searchQuery]);

  // ── Computed values ──
  const paidPayments = filteredPayments.filter((p) => p.status === "paid" || p.status === "approved");
  const pendingPayments = filteredPayments.filter((p) => p.status === "pending");
  const paymentRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  const incomeTotal = filteredTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = filteredTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = incomeTotal - expenseTotal;

  // Current month income for goal
  const currentMonthIncome = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return transactions.filter(t => t.type === "income" && t.date.startsWith(monthKey)).reduce((s, t) => s + t.amount, 0)
      + payments.filter(p => (p.status === "paid" || p.status === "approved") && p.createdAt.startsWith(monthKey)).reduce((s, p) => s + p.amount, 0);
  }, [transactions, payments]);

  const goalProgress = monthlyGoal > 0 ? Math.min((currentMonthIncome / monthlyGoal) * 100, 100) : 0;

  // ── Chart data ──
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

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredTransactions.forEach((tx) => {
      const cat = tx.category || (tx.type === "income" ? "Receita geral" : "Despesa geral");
      cats[cat] = (cats[cat] || 0) + tx.amount;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const paymentStatusData = useMemo(() => {
    const statuses: Record<string, number> = {};
    filteredPayments.forEach((p) => {
      const label = statusLabels[p.status] || p.status;
      statuses[label] = (statuses[label] || 0) + 1;
    });
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [filteredPayments]);

  // ── Export ──
  const handleExport = (type: "transactions" | "payments") => {
    if (type === "transactions") {
      exportCSV(filteredTransactions.map(t => ({
        tipo: t.type === "income" ? "Receita" : "Despesa",
        descricao: t.description,
        valor: t.amount,
        data: t.date,
        categoria: t.category || "",
      })), `financeiro_transacoes_${new Date().toISOString().split("T")[0]}.csv`);
    } else {
      exportCSV(filteredPayments.map(p => ({
        paciente: p.patientName,
        plano: p.planName,
        status: statusLabels[p.status] || p.status,
        valor: p.amount,
        gateway: p.gateway,
        data: new Date(p.createdAt).toLocaleDateString("pt-BR"),
      })), `financeiro_pagamentos_${new Date().toISOString().split("T")[0]}.csv`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow"
            >
              <DollarSign className="w-5 h-5 text-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="font-display text-2xl font-bold">Financeiro</h1>
              <p className="text-sm text-muted-foreground">Gestão completa de receitas, despesas e metas</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-1">
              <Filter className="w-4 h-4" /> Filtros
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleExport("transactions")} className="gap-1">
              <Download className="w-4 h-4" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setGoalInput(String(monthlyGoal || "")); setGoalOpen(true); }} className="gap-1">
              <Target className="w-4 h-4" /> Meta
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setTxForm({ ...defaultTxForm, type: "expense" }); setTxOpen(true); }} className="gap-1">
              <ArrowDownCircle className="w-4 h-4" /> Despesa
            </Button>
            <Button size="sm" onClick={() => { setTxForm({ ...defaultTxForm, type: "income" }); setTxOpen(true); }} className="gap-1 gradient-primary">
              <Plus className="w-4 h-4" /> Receita
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="glass shadow-card">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs text-muted-foreground">Buscar</Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Paciente, descrição..."
                          className="pl-9"
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2.5">
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="w-full sm:w-40">
                      <Label className="text-xs text-muted-foreground">Período</Label>
                      <Select value={periodFilter} onValueChange={setPeriodFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MONTHS_FILTER.map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full sm:w-40">
                      <Label className="text-xs text-muted-foreground">Status pagamento</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="paid">Pago</SelectItem>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="failed">Falhou</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Financial Goal */}
            {monthlyGoal > 0 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="glass shadow-card border-primary/20">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Meta Mensal</span>
                      </div>
                      <span className="text-sm font-bold">
                        R$ {currentMonthIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} / R$ {monthlyGoal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <Progress value={goalProgress} className="h-3" />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{goalProgress.toFixed(0)}% atingido</span>
                      {goalProgress >= 100 && (
                        <span className="text-xs text-emerald-500 font-semibold">🎉 Meta atingida!</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Pending Payments Alert */}
            {pendingPayments.length > 0 && (
              <Card className="border-amber-500/50 bg-amber-500/5">
                <CardContent className="flex items-start gap-3 py-4">
                  <Bell className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {pendingPayments.length} pagamento{pendingPayments.length > 1 ? "s" : ""} pendente{pendingPayments.length > 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {pendingPayments.slice(0, 3).map((p) => (
                        <Badge key={p.id} variant="outline" className="text-xs bg-amber-500/5">
                          {p.patientName} • R$ {p.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </Badge>
                      ))}
                      {pendingPayments.length > 3 && (
                        <Badge variant="outline" className="text-xs">+{pendingPayments.length - 3} mais</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Cards with Animations */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: "Pagamentos Confirmados", value: paidPayments.length, icon: CreditCard, color: "emerald", isCount: true },
                { label: "Receitas", value: incomeTotal, icon: ArrowUpCircle, color: "emerald", prefix: "R$ " },
                { label: "Despesas", value: expenseTotal, icon: ArrowDownCircle, color: "red", prefix: "R$ " },
                { label: "Saldo", value: balance, icon: TrendingUp, color: balance >= 0 ? "emerald" : "red", prefix: "R$ " },
              ].map((card, i) => {
                const Icon = card.icon;
                const colorBg = card.color === "emerald" ? "bg-emerald-500/10" : "bg-red-500/10";
                const colorText = card.color === "emerald" ? "text-emerald-500" : "text-red-500";
                return (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="glass shadow-card hover:shadow-lg transition-shadow">
                      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4 sm:py-6">
                        <div className={`w-10 h-10 rounded-xl ${colorBg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 ${colorText}`} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-lg sm:text-2xl font-bold font-display ${card.isCount ? "" : colorText}`}>
                            {card.isCount ? card.value : <AnimatedNumber value={card.value} prefix={card.prefix || ""} />}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{card.label}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

              <Card className="glass shadow-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Distribuição por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryData.length === 0 ? (
                    <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">Nenhuma transação registrada</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                          {categoryData.map((_, idx) => (<Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

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
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                      <Line type="monotone" dataKey="saldo" name="Saldo" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass shadow-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Status dos Pagamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentStatusData.length === 0 ? (
                    <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">Nenhum pagamento registrado</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={paymentStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}>
                          {paymentStatusData.map((_, idx) => (<Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Data Tabs */}
            <Tabs defaultValue="subscriptions" className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <TabsList className="w-full sm:w-auto justify-start bg-card border border-border flex-wrap">
                  <TabsTrigger value="subscriptions">Pagamentos</TabsTrigger>
                  <TabsTrigger value="stripe-income"><CreditCard className="w-3.5 h-3.5 mr-1" /> Stripe</TabsTrigger>
                  <TabsTrigger value="manual-income"><ArrowUpCircle className="w-3.5 h-3.5 mr-1" /> Manuais</TabsTrigger>
                  <TabsTrigger value="expenses"><ArrowDownCircle className="w-3.5 h-3.5 mr-1" /> Despesas</TabsTrigger>
                </TabsList>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleExport("payments")} className="gap-1 text-xs">
                    <FileText className="w-3.5 h-3.5" /> Exportar
                  </Button>
                </div>
              </div>

              <TabsContent value="subscriptions" className="mt-2">
                <PaginatedPayments
                  payments={filteredPayments}
                  statusColors={statusColors}
                  statusLabels={statusLabels}
                />
              </TabsContent>

              <TabsContent value="stripe-income" className="mt-2">
                <TransactionList
                  transactions={filteredTransactions.filter((t) => t.type === "income" && t.category === "assinatura")}
                  type="income" label="Receitas Stripe" emptyMessage="Nenhuma receita via Stripe registrada"
                  icon={<CreditCard className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />}
                  onAdd={() => { setTxForm({ ...defaultTxForm, type: "income", category: "assinatura" }); setTxOpen(true); }}
                  onEdit={editTransaction} onDelete={deleteTransaction}
                />
              </TabsContent>

              <TabsContent value="manual-income" className="mt-2">
                <TransactionList
                  transactions={filteredTransactions.filter((t) => t.type === "income" && t.category !== "assinatura")}
                  type="income" label="Receitas Manuais" emptyMessage="Nenhuma receita manual registrada"
                  onAdd={() => { setTxForm({ ...defaultTxForm, type: "income" }); setTxOpen(true); }}
                  onEdit={editTransaction} onDelete={deleteTransaction}
                />
              </TabsContent>

              <TabsContent value="expenses" className="mt-2">
                <TransactionList
                  transactions={filteredTransactions.filter((t) => t.type === "expense")}
                  type="expense"
                  onAdd={() => { setTxForm({ ...defaultTxForm, type: "expense" }); setTxOpen(true); }}
                  onEdit={editTransaction} onDelete={deleteTransaction}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Transaction Dialog */}
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

      {/* Goal Dialog */}
      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> Meta Mensal de Faturamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor da meta (R$)</Label>
              <Input type="number" step="0.01" min="0" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="Ex: 10000" />
            </div>
            <p className="text-xs text-muted-foreground">Defina quanto deseja faturar por mês. A barra de progresso será exibida automaticamente.</p>
            <div className="flex gap-2">
              {monthlyGoal > 0 && (
                <Button variant="outline" className="flex-1" onClick={() => { setMonthlyGoal(0); localStorage.removeItem("fj_financial_goal"); setGoalOpen(false); toast.success("Meta removida"); }}>
                  Remover Meta
                </Button>
              )}
              <Button className="flex-1 gradient-primary" onClick={saveGoal}>Salvar Meta</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// ── Paginated Payments Table ──
function PaginatedPayments({
  payments,
  statusColors,
  statusLabels,
}: {
  payments: PatientPayment[];
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
}) {
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<"date" | "amount" | "name">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const PER_PAGE = 10;

  const sorted = useMemo(() => {
    const arr = [...payments];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") cmp = a.createdAt.localeCompare(b.createdAt);
      else if (sortField === "amount") cmp = a.amount - b.amount;
      else cmp = a.patientName.localeCompare(b.patientName);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [payments, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paged = sorted.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const toggleSort = (field: "date" | "amount" | "name") => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  useEffect(() => { setPage(0); }, [payments]);

  return (
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
          <>
            {/* Sort buttons */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {[
                { field: "date" as const, label: "Data" },
                { field: "amount" as const, label: "Valor" },
                { field: "name" as const, label: "Nome" },
              ].map(s => (
                <Button
                  key={s.field}
                  size="sm"
                  variant={sortField === s.field ? "default" : "outline"}
                  className="gap-1 text-xs h-7"
                  onClick={() => toggleSort(s.field)}
                >
                  <ArrowUpDown className="w-3 h-3" /> {s.label}
                </Button>
              ))}
            </div>

            {/* Items */}
            <div className="space-y-2">
              {paged.map((pay) => (
                <motion.div
                  key={pay.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {pay.patientName[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{pay.patientName}</p>
                      <p className="text-xs text-muted-foreground truncate">{pay.planName} • {pay.gateway}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <Badge className={statusColors[pay.status] || "bg-muted text-muted-foreground"}>
                      {statusLabels[pay.status] || pay.status}
                    </Badge>
                    <p className="text-sm font-semibold mt-1">
                      R$ {pay.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(pay.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, sorted.length)} de {sorted.length}
                </span>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Transaction List ──
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
  const [page, setPage] = useState(0);
  const PER_PAGE = 10;
  const totalPages = Math.ceil(transactions.length / PER_PAGE);
  const paged = transactions.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  useEffect(() => { setPage(0); }, [transactions]);

  return (
    <Card className="glass shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-lg">{title}</CardTitle>
        <Button size="sm" onClick={onAdd} className="gap-1">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            {icon || (isIncome ? <ArrowUpCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" /> : <ArrowDownCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />)}
            <p className="text-sm text-muted-foreground">{emptyMessage || `Nenhuma ${isIncome ? "receita" : "despesa"} registrada`}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paged.map((tx) => (
                <motion.div key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isIncome ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                      {isIncome ? <ArrowUpCircle className="w-4 h-4 text-emerald-500" /> : <ArrowDownCircle className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {new Date(tx.date).toLocaleDateString("pt-BR")}
                        {tx.category && ` • ${tx.category}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
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
                </motion.div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">{page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, transactions.length)} de {transactions.length}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
