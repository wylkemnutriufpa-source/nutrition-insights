/**
 * IFJ Core / God Mode Panel — Copilot with smart templates and action execution
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { Badge } from "@v1/components/ui/badge";
import ReactMarkdown from "react-markdown";
import {
  Brain, Send, Loader2, AlertTriangle, Target,
  DollarSign, Calendar, Shield, Users, UtensilsCrossed,
  ChevronRight, Zap, Sparkles, RefreshCw, ClipboardList,
  UserCheck, CreditCard, FileCheck, TrendingUp, Rocket
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logAudit } from "@v1/lib/auditLog";

interface IFJResponse {
  title: string;
  icon: string;
  response_type: string;
  summary: string;
  body_markdown: string;
  actions: Array<{ label: string; route: string; type: string }>;
  meta: { intent: string; confidence: number; data_source: string; engine: string; used_context: boolean };
  sessionContext: Record<string, any>;
}

interface Message {
  role: "user" | "ifj";
  text: string;
  response?: IFJResponse;
  timestamp: Date;
}

interface PriorityItem {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  priority_score: number;
  priority_level: string;
  reasons_json: string[];
  source_engine: string;
}

const SMART_TEMPLATES = [
  { label: "Prioridades do dia", cmd: "O que preciso resolver hoje?", icon: Target, color: "border-red-500/30 text-red-400 hover:bg-red-500/10" },
  { label: "Quem precisa de atenção", cmd: "Quem precisa de atenção?", icon: AlertTriangle, color: "border-orange-500/30 text-orange-400 hover:bg-orange-500/10" },
  { label: "Aguardando onboarding", cmd: "Quem está aguardando liberação de onboarding?", icon: UserCheck, color: "border-blue-500/30 text-blue-400 hover:bg-blue-500/10" },
  { label: "Aguardando pagamento", cmd: "Quem não pagou?", icon: CreditCard, color: "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10" },
  { label: "Sem dieta", cmd: "Quem está sem dieta?", icon: UtensilsCrossed, color: "border-pink-500/30 text-pink-400 hover:bg-pink-500/10" },
  { label: "Aguardando aprovação", cmd: "Quem está aguardando aprovação?", icon: FileCheck, color: "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10" },
  { label: "Planos vencendo", cmd: "Planos vencendo", icon: Calendar, color: "border-amber-500/30 text-amber-400 hover:bg-amber-500/10" },
  { label: "Resumo financeiro", cmd: "Resumo financeiro", icon: DollarSign, color: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" },
  { label: "Panorama da carteira", cmd: "Resumo da carteira", icon: TrendingUp, color: "border-purple-500/30 text-purple-400 hover:bg-purple-500/10" },
  { label: "Próximas consultas", cmd: "Consultas", icon: Calendar, color: "border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10" },
  { label: "Alertas clínicos", cmd: "Alertas clínicos", icon: Shield, color: "border-red-500/30 text-red-400 hover:bg-red-500/10" },
  { label: "Quem melhorou", cmd: "Quem melhorou?", icon: Sparkles, color: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" },
  { label: "Liberar onboarding", cmd: "Quem precisa liberar onboarding?", icon: Rocket, color: "border-violet-500/30 text-violet-400 hover:bg-violet-500/10" },
  { label: "Comandos disponíveis", cmd: "Ajuda", icon: ClipboardList, color: "border-gray-500/30 text-gray-400 hover:bg-gray-500/10" },
];

export default function IFJCorePanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [priorities, setPriorities] = useState<PriorityItem[]>([]);
  const [loadingPriorities, setLoadingPriorities] = useState(true);
  const [showTemplates, setShowTemplates] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadPriorities();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const loadPriorities = async () => {
    try {
      const { data } = await supabase
        .from("ifj_priority_queue")
        .select("*")
        .eq("owner_user_id", user!.id)
        .eq("is_resolved", false)
        .order("priority_score", { ascending: false })
        .limit(10);
      setPriorities((data as PriorityItem[]) || []);
    } catch { } finally { setLoadingPriorities(false); }
  };

  const sendCommand = useCallback(async (command: string, silent = false) => {
    if (!command.trim() || !user) return;

    setShowTemplates(false);
    if (!silent) setMessages(prev => [...prev, { role: "user", text: command, timestamp: new Date() }]);
    setInput("");
    setLoading(true);

    logAudit("ifj_core_command", "ifj_core", null, { command });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ifj-core-router`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ input_text: command, session_key: "core_panel" }),
        }
      );

      if (!res.ok) throw new Error("Erro na resposta");
      const response: IFJResponse = await res.json();

      setMessages(prev => [...prev, { role: "ifj", text: response.body_markdown || response.summary, response, timestamp: new Date() }]);

      // Auto-navigate if response_type is "navigate" and has exactly one action
      if (response.response_type === "navigate" && response.actions?.length === 1) {
        setTimeout(() => navigate(response.actions[0].route), 500);
      }

      loadPriorities();
    } catch {
      setMessages(prev => [...prev, { role: "ifj", text: "❌ Erro ao processar comando. Tente novamente.", timestamp: new Date() }]);
    } finally { setLoading(false); }
  }, [user, navigate]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendCommand(input); };

  const handleAction = (action: { label: string; route: string; type: string }) => {
    if (action.type === "navigate") {
      logAudit("ifj_core_navigate", "ifj_core", null, { route: action.route });
      navigate(action.route);
    }
  };

  const getPriorityColor = (level: string) => {
    switch (level) {
      case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-background to-yellow-950/20 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
        <div className="relative flex items-center gap-4 flex-wrap">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/25">
            <Brain className="h-7 w-7 text-black" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent flex items-center gap-2">
              Copilot IFJ <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
            </h2>
            <p className="text-sm text-muted-foreground">Orquestrador Central • Diga o que precisa e eu executo</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10">
              <Shield className="h-3 w-3 mr-1" /> 100% Determinístico
            </Badge>
            <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">
              <Zap className="h-3 w-3 mr-1" /> Online
            </Badge>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Priority Sidebar */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-amber-500/20 bg-background/80 backdrop-blur-sm h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-400">
                  <Target className="h-4 w-4" /> Fila de Prioridades
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setLoadingPriorities(true); loadPriorities(); }}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingPriorities ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-amber-500" /></div>
              ) : priorities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">✅ Nenhuma prioridade pendente</p>
              ) : (
                priorities.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className={`p-3 rounded-lg border cursor-pointer hover:brightness-110 transition-all ${getPriorityColor(p.priority_level)}`}
                    onClick={() => {
                      logAudit("ifj_priority_click", "ifj_core", p.entity_id, { entity: p.entity_name, score: p.priority_score });
                      if (p.entity_type === "patient") navigate(`/patients/${p.entity_id}`);
                      else sendCommand(`Sobre ${p.entity_name}`);
                    }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{p.entity_name}</span>
                      <Badge variant="outline" className="text-xs shrink-0 ml-2">{p.priority_score}pts</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(p.reasons_json || []).slice(0, 2).map((r: string, j: number) => (
                        <span key={j} className="text-[10px] opacity-80">{r}</span>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Chat / Command Panel */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
          <Card className="border-amber-500/20 bg-background/80 backdrop-blur-sm flex flex-col" style={{ height: "600px" }}>
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {/* Smart Templates — shown when no messages */}
              {showTemplates && messages.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="text-center pb-2">
                    <Rocket className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                    <h3 className="text-lg font-semibold text-amber-400">O que você precisa?</h3>
                    <p className="text-xs text-muted-foreground mt-1">Clique em um template ou digite seu comando</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SMART_TEMPLATES.map((t) => (
                      <button
                        key={t.cmd}
                        onClick={() => sendCommand(t.cmd)}
                        className={`p-3 rounded-xl border text-left transition-all ${t.color} group`}
                        disabled={loading}
                      >
                        <t.icon className="h-4 w-4 mb-1.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                        <p className="text-xs font-medium leading-tight">{t.label}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`mb-4 ${msg.role === "user" ? "flex justify-end" : ""}`}>
                    {msg.role === "user" ? (
                      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-amber-500/20 border border-amber-500/30 px-4 py-2.5">
                        <p className="text-sm text-amber-100">{msg.text}</p>
                      </div>
                    ) : (
                      <div className="max-w-[95%]">
                        {msg.response && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{msg.response.icon}</span>
                            <span className="text-sm font-semibold text-amber-400">{msg.response.title}</span>
                            {msg.response.meta && (
                              <Badge variant="outline" className="text-[10px] border-amber-500/20 text-muted-foreground">
                                {msg.response.meta.engine} • {(msg.response.meta.confidence * 100).toFixed(0)}%
                              </Badge>
                            )}
                            {msg.response.response_type === "action_completed" && (
                              <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] border-emerald-500/30">
                                ✓ Executado
                              </Badge>
                            )}
                          </div>
                        )}
                        {msg.response?.summary && <p className="text-xs text-muted-foreground mb-2">{msg.response.summary}</p>}
                        <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3 prose prose-sm prose-invert max-w-none
                          prose-headings:text-amber-400 prose-strong:text-foreground prose-td:text-sm prose-th:text-xs prose-th:text-amber-400/80
                          prose-table:border-collapse prose-td:border prose-td:border-border/30 prose-td:px-2 prose-td:py-1
                          prose-th:border prose-th:border-border/30 prose-th:px-2 prose-th:py-1">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                        {msg.response?.actions && msg.response.actions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {msg.response.actions.map((action, j) => (
                              <Button key={j} size="sm" variant="outline"
                                className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                onClick={() => handleAction(action)}>
                                <ChevronRight className="h-3 w-3 mr-1" /> {action.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-amber-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Processando...</span>
                </motion.div>
              )}
            </ScrollArea>

            {/* Input + quick back to templates */}
            <div className="border-t border-amber-500/10">
              {messages.length > 0 && (
                <div className="px-3 pt-2 flex gap-1 flex-wrap">
                  <Button variant="ghost" size="sm" className="text-[10px] h-6 text-muted-foreground hover:text-amber-400"
                    onClick={() => { setMessages([]); setShowTemplates(true); }}>
                    <ClipboardList className="h-3 w-3 mr-1" /> Templates
                  </Button>
                  {SMART_TEMPLATES.slice(0, 4).map((t) => (
                    <Button key={t.cmd} variant="ghost" size="sm" className="text-[10px] h-6 text-muted-foreground hover:text-amber-400"
                      onClick={() => sendCommand(t.cmd)} disabled={loading}>
                      <t.icon className="h-3 w-3 mr-1" /> {t.label}
                    </Button>
                  ))}
                </div>
              )}
              <form onSubmit={handleSubmit} className="p-3 flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Ex: libere onboarding da Maria, quem está sem dieta..."
                  className="flex-1 border-amber-500/20 bg-muted/30 focus:border-amber-500/50 placeholder:text-muted-foreground/50" disabled={loading} />
                <Button type="submit" disabled={loading || !input.trim()}
                  className="bg-gradient-to-r from-amber-500 to-yellow-600 text-black hover:from-amber-600 hover:to-yellow-700 shadow-lg shadow-amber-500/20">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
