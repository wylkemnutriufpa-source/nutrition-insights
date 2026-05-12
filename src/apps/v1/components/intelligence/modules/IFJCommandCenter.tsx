/**
 * IFJ Command Center v2 — Hardened Role-scoped AI Copilot
 * 
 * Security model:
 * - Action classification: CONSULT | SUGGEST | PREPARE | EXECUTE
 * - Destructive/sensitive actions require explicit confirmation
 * - Every interaction generates audit log
 * - RLS-scoped data access per role
 * - Admin gets full access but critical actions still need confirmation
 */
import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import {
  Brain, Send, Loader2, Trash2, ExternalLink,
  Crown, Zap, Shield, Command, AlertTriangle, Eye,
  Lightbulb, Wrench, Play
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
const IFJSmartActions = lazy(() => import("./IFJSmartActions"));

/* ─── Types ─── */
type ActionType = "navigate" | "confirm" | "disambiguate";

type ActionButton = {
  label: string;
  route: string;
  type?: ActionType;
  confirmMessage?: string;
  patient_id?: string;
  original_command?: string;
  subtitle?: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  actions?: ActionButton[];
  actionLevel?: "consult" | "suggest" | "prepare" | "execute";
};

export type IFJRole = "admin" | "nutritionist" | "personal" | "patient";

interface IFJCommandCenterProps {
  role?: IFJRole;
}

/* ─── Role Config ─── */
const ROLE_CONFIG: Record<IFJRole, {
  label: string;
  edgeFunction: string;
  badge: string;
  subtitle: string;
  suggestions: string[];
}> = {
  admin: {
    label: "ADMIN — God Mode",
    edgeFunction: "ifj-core-router",
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    subtitle: "Centro de Comando — Visão global do sistema",
    suggestions: [
      "Quem precisa de atenção urgente?",
      "Como está meu financeiro?",
      "Resuma minha carteira de pacientes",
      "Quais planos vencem essa semana?",
      "Algum paciente em risco de abandono?",
    ],
  },
  nutritionist: {
    label: "Nutricionista",
    edgeFunction: "ifj-core-router",
    badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    subtitle: "Mini God Mode — Sua carteira clínica",
    suggestions: [
      "Quem precisa de atenção hoje?",
      "Resuma minha carteira",
      "Quais pacientes estão em risco?",
      "Algum plano vence essa semana?",
      "Como está o financeiro dos pacientes?",
    ],
  },
  personal: {
    label: "Personal Trainer",
    edgeFunction: "ifj-core-router",
    badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    subtitle: "Mini God Mode — Seus alunos e treinos",
    suggestions: [
      "Quais alunos treinaram hoje?",
      "Algum aluno reportou dor?",
      "Resuma meus alunos ativos",
      "Quem precisa de ajuste no treino?",
      "Mostre os feedbacks pendentes",
    ],
  },
  patient: {
    label: "Meu Assistente IFJ",
    edgeFunction: "ifj-core-router",
    badge: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    subtitle: "Sua assistente pessoal de saúde",
    suggestions: [
      "Me passa uma opção prática de lanche",
      "Qual minha próxima consulta?",
      "Mostre meu progresso",
      "Quais tarefas preciso fazer hoje?",
      "Me ajude a entender meu plano alimentar",
    ],
  },
};


/* ─── Action Level Icons ─── */
const ACTION_LEVEL_ICON: Record<string, typeof Eye> = {
  consult: Eye,
  suggest: Lightbulb,
  prepare: Wrench,
  execute: Play,
};

const ACTION_LEVEL_LABEL: Record<string, string> = {
  consult: "Consulta",
  suggest: "Sugestão",
  prepare: "Preparação",
  execute: "Execução",
};

/* ─── Greeting Generator ─── */
function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const period = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const greetings: Record<string, string[]> = {
    morning: [
      `Bom dia, ${name}! ☀️ No que posso te ajudar hoje?`,
      `Bom dia, ${name}! Pronto pra mais um dia produtivo?`,
      `Olá ${name}, bom dia! Já analisei tudo — me pergunte qualquer coisa.`,
      `Bom dia! ${name}, estou conectada ao sistema. O que vamos resolver?`,
      `E aí ${name}, bom dia! ☕ Vamos trabalhar no quê hoje?`,
    ],
    afternoon: [
      `Boa tarde, ${name}! Como posso te ajudar agora?`,
      `E aí ${name}, boa tarde! No que trabalhamos?`,
      `Boa tarde! ${name}, estou monitorando tudo. Precisa de algo?`,
      `Olá ${name}! Boa tarde. Me pergunte qualquer coisa!`,
      `Boa tarde, ${name}! Estou pronta — me dê um comando.`,
    ],
    evening: [
      `Boa noite, ${name}! Ainda trabalhando? Me diga o que precisa.`,
      `Boa noite ${name}! Estou aqui caso precise de algo.`,
      `E aí ${name}, boa noite! Vamos finalizar alguma pendência?`,
      `Boa noite! ${name}, precisa ajustar algo?`,
      `Olá ${name}, boa noite! 🌙 Qualquer comando, estou pronta.`,
    ],
  };
  const options = greetings[period];
  return options[Math.floor(Math.random() * options.length)];
}

/* ─── Component ─── */
export default function IFJCommandCenter({ role: roleProp }: IFJCommandCenterProps = {}) {
  const { user, profile, roles } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ActionButton | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const detectedRole: IFJRole = roleProp || (
    roles?.includes("admin") ? "admin" :
    roles?.includes("personal") ? "personal" :
    roles?.includes("patient") ? "patient" :
    "nutritionist"
  );
  const config = ROLE_CONFIG[detectedRole];
  const isAdmin = detectedRole === "admin";

  const greeting = useMemo(
    () => getGreeting(profile?.full_name?.split(" ")[0] || "Profissional"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /* ─── Audit Logger ─── */
  const logAudit = useCallback(async (action: string, metadata?: Record<string, unknown>) => {
    if (!user) return;
    try {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action,
        resource_type: "ifj_command_center",
        resource_id: detectedRole,
        metadata: { ...metadata, role: detectedRole, timestamp: new Date().toISOString() },
      } as any);
    } catch (e) {
      console.error("IFJ audit log failed:", e);
    }
  }, [user, detectedRole]);

  /* ─── Parse Actions from AI response ─── */
  const parseActionsFromResponse = (text: string): { cleanText: string; actions: ActionButton[]; level: Message["actionLevel"] } => {
    const actions: ActionButton[] = [];

    // Parse navigate actions: [ACTION:Label|/route]
    const navRegex = /\[ACTION:(.+?)\|(.+?)\]/g;
    let match;
    while ((match = navRegex.exec(text)) !== null) {
      actions.push({ label: match[1].trim(), route: match[2].trim(), type: "navigate" });
    }

    // Parse confirm actions: [CONFIRM:Label|/route|ConfirmMessage]
    const confirmRegex = /\[CONFIRM:(.+?)\|(.+?)\|(.+?)\]/g;
    while ((match = confirmRegex.exec(text)) !== null) {
      actions.push({
        label: match[1].trim(),
        route: match[2].trim(),
        type: "confirm",
        confirmMessage: match[3].trim(),
      });
    }

    const cleanText = text.replace(navRegex, "").replace(confirmRegex, "").trim();

    // Detect action level from tags
    let level: Message["actionLevel"] = "consult";
    if (text.includes("[LEVEL:execute]")) level = "execute";
    else if (text.includes("[LEVEL:prepare]")) level = "prepare";
    else if (text.includes("[LEVEL:suggest]")) level = "suggest";
    const finalClean = cleanText.replace(/\[LEVEL:\w+\]/g, "").trim();

    return { cleanText: finalClean, actions, level };
  };

  /* ─── Handle action button click ─── */
  const handleAction = useCallback(async (action: ActionButton) => {
    if (action.type === "confirm") {
      setConfirmAction(action);
      return;
    }
    if (action.type === "disambiguate" && action.patient_id && action.original_command) {
      // Re-send the original command with the selected patient ID
      await logAudit("ifj_disambiguate_select", { patient_id: action.patient_id, label: action.label, command: action.original_command });
      sendMessageWithTargetId(action.original_command, action.patient_id);
      return;
    }
    await logAudit("ifj_navigate", { route: action.route, label: action.label });
    navigate(action.route);
  }, [navigate, logAudit]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    await logAudit("ifj_confirmed_action", { route: confirmAction.route, label: confirmAction.label });
    navigate(confirmAction.route);
    setConfirmAction(null);
    toast.success(`Ação confirmada: ${confirmAction.label}`);
  }, [confirmAction, navigate, logAudit]);

  /* ─── Send Message (Deterministic — JSON, no streaming) ─── */
  const sendMessage = async (text: string, targetId?: string) => {
    if (!text.trim() || isLoading || !user) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    if (!targetId) {
      setMessages(prev => [...prev, userMsg]);
      setInput("");
    }
    setIsLoading(true);

    await logAudit("ifj_command_sent", { command: text.trim().substring(0, 200), target_id: targetId });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload: Record<string, unknown> = { command: text.trim(), isAdmin };
      if (targetId) payload.target_id = targetId;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${config.edgeFunction}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!resp.ok) {
        if (resp.status === 429) { toast.error("Limite de requisições. Aguarde um momento."); throw new Error("rate"); }
        if (resp.status === 402) { toast.error("Créditos insuficientes."); throw new Error("credits"); }
        if (resp.status === 403) { toast.error("Sem permissão para esta ação."); throw new Error("forbidden"); }
        throw new Error(`Error: ${resp.status}`);
      }

      const data = await resp.json();
      // ifj-core-router returns body_markdown (not response)
      const responseText = data.body_markdown || data.response || "Sem resposta.";
      const serverActions: ActionButton[] = (data.actions || []).map((a: any) => ({
        label: a.label,
        route: a.route,
        type: a.type || "navigate",
        confirmMessage: a.confirmMessage,
        patient_id: a.patient_id,
        original_command: a.original_command,
        subtitle: a.subtitle,
      }));
      // Action level from meta.intent action_type or response_type
      const metaIntent = data.meta?.intent || "";
      const actionLevel = (
        data.response_type === "action" ? "execute" :
        data.response_type === "navigate" ? "prepare" :
        data.response_type === "suggestions" ? "suggest" :
        "consult"
      ) as Message["actionLevel"];

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: responseText, actions: serverActions, actionLevel },
      ]);

      await logAudit("ifj_response_received", { responseLength: responseText.length, intent: metaIntent, dataSource: data.meta?.data_source, engine: data.meta?.engine });
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Desculpe, tive um problema ao processar. Tente novamente." },
      ]);
      await logAudit("ifj_error", { error: String(e) });
    }
    setIsLoading(false);
  };

  const sendMessageWithTargetId = (text: string, targetId: string) => {
    sendMessage(text, targetId);
  };

  return (
    <div className="relative">
      {/* Ambient particles — reduced on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-amber-400/30"
            initial={{ x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%`, opacity: 0 }}
            animate={{ y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`], opacity: [0, 0.5, 0] }}
            transition={{ duration: 5 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3 }}
          />
        ))}
      </div>

      {/* Command Center Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative border-2 border-amber-500/30 rounded-xl bg-gradient-to-br from-background via-background to-amber-950/5 overflow-hidden"
      >
        {/* Header — responsive */}
        <div className="relative px-4 py-4 md:px-6 md:py-5 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-amber-400/10 to-amber-500/5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
          <div className="relative flex items-center gap-3 md:gap-4">
            <motion.div
              className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0"
              animate={{ boxShadow: ["0 0 20px rgba(245,158,11,0.2)", "0 0 35px rgba(245,158,11,0.35)", "0 0 20px rgba(245,158,11,0.2)"] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Command className="w-5 h-5 md:w-7 md:h-7 text-white" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base md:text-xl font-bold bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent whitespace-nowrap">
                  Meu Painel IFJ
                </h2>
                <Crown className="w-4 h-4 md:w-5 md:h-5 text-amber-500 shrink-0" />
                <span className={`text-[8px] md:text-[9px] px-1.5 md:px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${config.badge}`}>
                  <Shield className="w-2.5 h-2.5 md:w-3 md:h-3" /> {config.label}
                </span>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 truncate">
                {config.subtitle}
              </p>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 md:h-8 text-amber-500/70 hover:text-amber-500 shrink-0 text-[10px] md:text-xs px-2"
                onClick={() => { setMessages([]); logAudit("ifj_conversation_cleared"); }}
              >
                <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" />
                <span className="hidden sm:inline">Nova conversa</span>
              </Button>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <ScrollArea className="h-[380px] md:h-[460px]" ref={scrollRef as any}>
          <div className="p-3 md:p-4 space-y-3 md:space-y-4">
            {/* Welcome */}
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-4 md:py-6 space-y-4 md:space-y-5"
              >
                <motion.div
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-yellow-500/20 flex items-center justify-center mx-auto border border-amber-500/20"
                  animate={{ boxShadow: ["0 0 0px rgba(245,158,11,0.1)", "0 0 25px rgba(245,158,11,0.25)", "0 0 0px rgba(245,158,11,0.1)"] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Brain className="w-8 h-8 md:w-10 md:h-10 text-amber-500/70" />
                </motion.div>

                <div className="max-w-sm md:max-w-md mx-auto px-2">
                  <p className="text-sm md:text-base font-medium bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent leading-relaxed">
                    {greeting}
                  </p>
                  <p className="text-[10px] md:text-[11px] text-muted-foreground/60 mt-2 leading-relaxed">
                    Posso consultar dados, sugerir ações, preparar operações e executar com sua confirmação.
                  </p>
                </div>

                {/* Action level legend */}
                <div className="flex flex-wrap justify-center gap-2 md:gap-3 px-2">
                  {(["consult", "suggest", "prepare", "execute"] as const).map(level => {
                    const Icon = ACTION_LEVEL_ICON[level];
                    return (
                      <div key={level} className="flex items-center gap-1 text-[9px] md:text-[10px] text-muted-foreground/50">
                        <Icon className="w-3 h-3" />
                        <span>{ACTION_LEVEL_LABEL[level]}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-1.5 md:gap-2 justify-center max-w-lg mx-auto px-2">
                  {config.suggestions.map((cmd, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 * i }}
                      onClick={() => sendMessage(cmd)}
                      className="text-[10px] md:text-[11px] px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg border border-amber-500/20 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all flex items-center gap-1 md:gap-1.5"
                    >
                      <Zap className="w-2.5 h-2.5 md:w-3 md:h-3 shrink-0" />
                      <span className="text-left">{cmd}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Smart Actions — role-aware shortcuts */}
                <Suspense fallback={null}>
                  <IFJSmartActions role={detectedRole} />
                </Suspense>
              </motion.div>
            )}

            {/* Messages */}
            <AnimatePresence mode="popLayout">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[92%] md:max-w-[88%] space-y-2">
                    {/* Action level badge for assistant */}
                    {msg.role === "assistant" && msg.actionLevel && (
                      <div className="flex items-center gap-1 mb-1">
                        {(() => { const Icon = ACTION_LEVEL_ICON[msg.actionLevel]; return <Icon className="w-3 h-3 text-amber-500/50" />; })()}
                        <span className="text-[9px] text-amber-500/50 font-medium">{ACTION_LEVEL_LABEL[msg.actionLevel]}</span>
                      </div>
                    )}
                    <div
                      className={`rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                          : "bg-muted/30 border border-amber-500/10"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_li]:mb-0.5 [&_p]:leading-relaxed [&_li]:leading-relaxed break-words">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="break-words leading-relaxed">{msg.content}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className={`flex flex-wrap gap-1.5 md:gap-2 ${msg.actions.some(a => a.type === "disambiguate") ? "flex-col" : ""}`}>
                        {msg.actions.map((action, ai) => (
                          <motion.button
                            key={ai}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 * ai }}
                            onClick={() => handleAction(action)}
                            className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg border transition-all text-[10px] md:text-xs font-medium ${
                              action.type === "confirm"
                                ? "bg-destructive/5 border-destructive/30 text-destructive hover:bg-destructive/10"
                                : action.type === "disambiguate"
                                  ? "bg-gradient-to-r from-amber-500/5 to-amber-600/10 border-amber-500/25 text-foreground hover:from-amber-500/15 hover:to-amber-600/20 hover:border-amber-500/50 w-full justify-start"
                                  : "bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-amber-500/30 text-amber-500 hover:from-amber-500/20 hover:to-amber-600/20"
                            }`}
                          >
                            {action.type === "confirm"
                              ? <AlertTriangle className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
                              : action.type === "disambiguate"
                                ? <Play className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0 text-amber-500" />
                                : <ExternalLink className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
                            }
                            <div className={`${action.type === "disambiguate" ? "flex flex-col items-start text-left" : ""}`}>
                              <span className={`${action.type === "disambiguate" ? "font-semibold text-xs" : "truncate"}`}>{action.label}</span>
                              {action.subtitle && (
                                <span className="text-[9px] md:text-[10px] text-muted-foreground font-normal">{action.subtitle}</span>
                              )}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-muted/30 rounded-xl px-3 md:px-4 py-2.5 md:py-3 border border-amber-500/10">
                  <div className="flex items-center gap-2 text-[10px] md:text-xs text-amber-500/70">
                    <Loader2 className="w-3 h-3 md:w-3.5 md:h-3.5 animate-spin" />
                    Analisando o sistema...
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 md:p-4 border-t border-amber-500/20 bg-gradient-to-r from-amber-500/[0.02] to-transparent">
          <form
            onSubmit={e => { e.preventDefault(); sendMessage(input); }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={detectedRole === "patient" ? "Pergunte qualquer coisa..." : "Comando... Ex: 'Abra o financeiro'"}
              disabled={isLoading}
              className="border-amber-500/20 focus-visible:ring-amber-500/30 bg-background/80 text-xs md:text-sm"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="sm"
              className="shrink-0 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white h-9 md:h-10 px-3 md:px-4"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </motion.div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={open => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirmação Necessária
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.confirmMessage || `Tem certeza que deseja executar: "${confirmAction?.label}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Ação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
