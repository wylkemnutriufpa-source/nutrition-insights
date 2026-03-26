/**
 * IFJ Command Center — Role-scoped omniscient AI copilot
 * Premium golden command panel. Each role only accesses their own data.
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import {
  Brain, Send, Loader2, Sparkles, Trash2, ExternalLink,
  Crown, Zap, Shield, Command
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
  actions?: ActionButton[];
};

type ActionButton = {
  label: string;
  route: string;
  icon?: string;
};

export type IFJRole = "admin" | "nutritionist" | "personal" | "patient";

interface IFJCommandCenterProps {
  role?: IFJRole;
}

const ROLE_CONFIG: Record<IFJRole, { label: string; edgeFunction: string; badge: string; badgeColor: string; suggestions: string[] }> = {
  admin: {
    label: "ADMIN — Acesso Total",
    edgeFunction: "ifj-command-center",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
    badgeColor: "red",
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
    edgeFunction: "ifj-command-center",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    badgeColor: "emerald",
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
    edgeFunction: "ifj-command-center-personal",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    badgeColor: "blue",
    suggestions: [
      "Quais alunos treinaram hoje?",
      "Algum aluno reportou dor?",
      "Resuma meus alunos ativos",
      "Quem precisa de ajuste no treino?",
      "Mostre os feedbacks pendentes",
    ],
  },
  patient: {
    label: "Paciente",
    edgeFunction: "ifj-command-center-patient",
    badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    badgeColor: "violet",
    suggestions: [
      "Como está minha dieta hoje?",
      "Qual minha próxima consulta?",
      "Mostre meu progresso",
      "Quais tarefas preciso fazer hoje?",
      "Me ajude a entender meu plano alimentar",
    ],
  },
};

// Time-based greetings with variety
function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const period = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  const greetings: Record<string, string[]> = {
    morning: [
      `Bom dia, ${name}! ☀️ No que posso te ajudar hoje?`,
      `Bom dia, ${name}! Pronto pra mais um dia produtivo? Me diga o que precisa!`,
      `Olá ${name}, bom dia! Já analisei tudo — me pergunte qualquer coisa.`,
      `Bom dia! ${name}, estou aqui e conectada. O que vamos resolver hoje?`,
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
      `Boa noite, ${name}! Ainda trabalhando? Me diga no que posso ajudar.`,
      `Boa noite ${name}! Estou aqui caso precise de algo.`,
      `E aí ${name}, boa noite! Vamos finalizar alguma pendência?`,
      `Boa noite! ${name}, precisa ajustar algo?`,
      `Olá ${name}, boa noite! 🌙 Qualquer comando, estou pronta.`,
    ],
  };

  const options = greetings[period];
  return options[Math.floor(Math.random() * options.length)];
}

export default function IFJCommandCenter({ role: roleProp }: IFJCommandCenterProps = {}) {
  const { user, profile, roles } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-detect role if not provided
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

  const parseActionsFromResponse = (text: string): { cleanText: string; actions: ActionButton[] } => {
    const actions: ActionButton[] = [];
    const actionRegex = /\[ACTION:(.+?)\|(.+?)\]/g;
    let match;

    while ((match = actionRegex.exec(text)) !== null) {
      actions.push({ label: match[1].trim(), route: match[2].trim() });
    }

    const cleanText = text.replace(actionRegex, "").trim();
    return { cleanText, actions };
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !user) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${config.edgeFunction}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            command: text.trim(),
            conversationHistory: messages.slice(-12).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            isAdmin,
          }),
        }
      );

      if (!resp.ok) {
        if (resp.status === 429) { toast.error("Limite de requisições. Aguarde."); throw new Error("rate"); }
        if (resp.status === 402) { toast.error("Créditos insuficientes."); throw new Error("credits"); }
        throw new Error(`Error: ${resp.status}`);
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              const { cleanText, actions } = parseActionsFromResponse(assistantSoFar);
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: cleanText, actions } : m
                  );
                }
                return [...prev, { role: "assistant", content: cleanText, actions }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      if (!assistantSoFar) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Desculpe, tive um problema ao processar. Tente novamente." },
        ]);
      }
    }
    setIsLoading(false);
  };

  const QUICK_COMMANDS = [
    "Quem precisa de atenção urgente?",
    "Como está meu financeiro?",
    "Resuma minha carteira de pacientes",
    "Quais planos vencem essa semana?",
    "Algum paciente em risco de abandono?",
  ];

  return (
    <div className="relative">
      {/* Ambient golden particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-amber-400/30"
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
              opacity: 0,
            }}
            animate={{
              y: [Math.random() * 100 + "%", Math.random() * 100 + "%"],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* Command Center Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative border-2 border-amber-500/30 rounded-xl bg-gradient-to-br from-background via-background to-amber-950/5 overflow-hidden"
      >
        {/* Premium Header */}
        <div className="relative px-6 py-5 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-amber-400/10 to-amber-500/5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
          <div className="relative flex items-center gap-4">
            <motion.div
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/25"
              animate={{ boxShadow: ["0 0 20px rgba(245,158,11,0.2)", "0 0 40px rgba(245,158,11,0.4)", "0 0 20px rgba(245,158,11,0.2)"] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Command className="w-7 h-7 text-white" />
            </motion.div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
                  Meu Painel IFJ
                </h2>
                <Crown className="w-5 h-5 text-amber-500" />
                {isAdmin && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> ADMIN — Acesso Total
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Centro de Comando Inteligente — Controle total do seu sistema
              </p>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-amber-500/70 hover:text-amber-500"
                onClick={() => setMessages([])}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Nova conversa
              </Button>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <ScrollArea className="h-[480px]" ref={scrollRef as any}>
          <div className="p-4 space-y-4">
            {/* Welcome message */}
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-6 space-y-5"
              >
                <motion.div
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-yellow-500/20 flex items-center justify-center mx-auto border border-amber-500/20"
                  animate={{
                    boxShadow: [
                      "0 0 0px rgba(245,158,11,0.1)",
                      "0 0 30px rgba(245,158,11,0.3)",
                      "0 0 0px rgba(245,158,11,0.1)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Brain className="w-10 h-10 text-amber-500/70" />
                </motion.div>

                <div className="max-w-md mx-auto">
                  <p className="text-base font-medium bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                    {greeting}
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 mt-2">
                    Tenho acesso completo ao sistema. Posso navegar, analisar, enviar lembretes e resolver problemas.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                  {QUICK_COMMANDS.map((cmd, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      onClick={() => sendMessage(cmd)}
                      className="text-[11px] px-3 py-2 rounded-lg border border-amber-500/20 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all flex items-center gap-1.5"
                    >
                      <Zap className="w-3 h-3" />
                      {cmd}
                    </motion.button>
                  ))}
                </div>
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
                  <div className="max-w-[88%] space-y-2">
                    <div
                      className={`rounded-xl px-4 py-3 text-sm ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                          : "bg-muted/30 border border-amber-500/10"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_li]:mb-0.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {msg.actions.map((action, ai) => (
                          <motion.button
                            key={ai}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 * ai }}
                            onClick={() => navigate(action.route)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 text-amber-500 hover:from-amber-500/20 hover:to-amber-600/20 transition-all text-xs font-medium"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {action.label}
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
                <div className="bg-muted/30 rounded-xl px-4 py-3 border border-amber-500/10">
                  <div className="flex items-center gap-2 text-xs text-amber-500/70">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analisando o sistema...
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-amber-500/20 bg-gradient-to-r from-amber-500/[0.02] to-transparent">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Me dê um comando... Ex: 'Abra o financeiro', 'Como está a Maria?'"
              disabled={isLoading}
              className="border-amber-500/20 focus-visible:ring-amber-500/30 bg-background/80"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="sm"
              className="shrink-0 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
