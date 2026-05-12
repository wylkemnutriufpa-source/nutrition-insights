/**
 * IFJ Patient Coach — AI chat assistant for patients
 * Contextual coaching with plan awareness
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { Brain, Send, Loader2, X, Sparkles, Heart } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_QUESTIONS = [
  "Como está minha dieta?",
  "Quais tarefas hoje?",
  "Meu progresso",
  "Próxima consulta",
];

export default function IFJPatientCoach() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ifj-patient-coach`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ question: text.trim() }),
        }
      );

      if (!resp.ok) {
        if (resp.status === 429) toast.error("Muitas perguntas. Aguarde um momento.");
        throw new Error(`Error: ${resp.status}`);
      }

      const data = await resp.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response || "Sem resposta." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Desculpe, estou com dificuldade agora. Tente novamente em instantes 💙" }]);
    }
    setIsLoading(false);
  };

  if (!open) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 z-[9989] w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(45 70% 45%))",
          boxShadow: "0 4px 20px -4px hsl(45 80% 50% / 0.3)",
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Heart className="w-6 h-6 text-primary-foreground" />
        </motion.div>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="fixed bottom-4 left-4 right-4 sm:left-4 sm:right-auto sm:w-[380px] z-[9989] rounded-2xl shadow-2xl border border-amber-500/20 bg-background/98 backdrop-blur-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-amber-500/10 to-primary/10 border-b border-amber-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/30 to-primary/30 flex items-center justify-center">
            <Brain className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-bold bg-gradient-to-r from-amber-500 to-primary bg-clip-text text-transparent">
              IFJ Coach
            </p>
            <p className="text-[9px] text-muted-foreground">Sua assistente pessoal de saúde</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="h-[350px] p-3" ref={scrollRef as any}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6 space-y-3">
              <Sparkles className="w-10 h-10 text-amber-500/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Olá, {profile?.full_name?.split(" ")[0] || ""}! 👋
              </p>
              <p className="text-xs text-muted-foreground/70">Como posso te ajudar hoje?</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {QUICK_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-[10px] px-2.5 py-1 rounded-full border border-amber-500/20 text-amber-600 hover:bg-amber-500/10 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 border border-amber-500/10"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs [&_p]:mb-1">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : <p className="text-xs">{msg.content}</p>}
              </div>
            </motion.div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-muted/50 rounded-xl px-3 py-2 border border-amber-500/10">
                <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-amber-500/10">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre seu plano..."
            disabled={isLoading}
            className="text-sm h-9 border-amber-500/20"
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="sm" className="h-9 w-9 p-0 shrink-0">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
