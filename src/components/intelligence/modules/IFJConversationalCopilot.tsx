/**
 * IFJ Conversational Copilot — Clinical chat for professionals
 * Queries patient data via natural language with streaming AI responses
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Send, Loader2, Sparkles, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Quem precisa de atenção hoje?",
  "Quais pacientes estão em risco de abandonar?",
  "Resuma o estado da minha carteira",
  "Quem está em platô há mais tempo?",
  "Mostre pacientes com baixa adesão",
];

export default function IFJConversationalCopilot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !user) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ifj-core-router`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ command: text.trim(), isAdmin: false }),
        }
      );

      if (!resp.ok) {
        if (resp.status === 429) { toast.error("Limite de requisições. Tente novamente em instantes."); throw new Error("rate limited"); }
        throw new Error(`Error: ${resp.status}`);
      }

      const data = await resp.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.body_markdown || data.response || "Sem resposta." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Desculpe, não consegui processar sua pergunta. Tente novamente." }]);
    }
    setIsLoading(false);
  };

  return (
    <Card className="border-amber-500/20 bg-background/95 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-primary/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <span className="bg-gradient-to-r from-amber-500 to-primary bg-clip-text text-transparent font-bold">
              IFJ Copiloto Clínico
            </span>
            <p className="text-[10px] text-muted-foreground font-normal">Converse com sua inteligência clínica</p>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => setMessages([])}>
              <Trash2 className="w-3 h-3 mr-1" /> Limpar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Messages area */}
        <ScrollArea className="h-[400px] pr-2" ref={scrollRef as any}>
          <div className="space-y-3">
            {messages.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/10 to-primary/10 flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-amber-500/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pergunte qualquer coisa sobre seus pacientes</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">A IFJ consulta dados reais da sua carteira clínica</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="text-[11px] px-3 py-1.5 rounded-full border border-amber-500/20 text-amber-600 hover:bg-amber-500/10 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="popLayout">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 border border-amber-500/10"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_li]:mb-0.5">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-muted/50 rounded-xl px-4 py-3 border border-amber-500/10">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Analisando dados clínicos...
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre seus pacientes..."
            disabled={isLoading}
            className="border-amber-500/20 focus-visible:ring-amber-500/30"
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="sm" className="shrink-0">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
