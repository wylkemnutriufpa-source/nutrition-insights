import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Image, BarChart3, X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Props {
  userRole?: string;
}

export default function CreateTimelinePost({ userRole }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isPro = userRole === "nutritionist" || userRole === "admin";

  const handlePost = async () => {
    if (!user || (!title.trim() && !text.trim())) return;
    setPosting(true);
    try {
      const payload: any = {
        workspace_id: user.id,
        author_id: user.id,
        event_type: showPoll ? "poll" : (isPro ? "professional_post" : "patient_post"),
        title: title.trim() || text.trim().slice(0, 60),
        description: text.trim() || null,
        visibility_scope: "global",
      };
      if (showPoll && pollQuestion.trim()) {
        payload.poll_question = pollQuestion.trim();
        payload.poll_options = pollOptions.filter(o => o.trim());
      }
      await supabase.from("timeline_events").insert(payload);
      queryClient.invalidateQueries({ queryKey: ["timeline-events"] });
      setText(""); setTitle(""); setPollQuestion(""); setPollOptions(["", ""]); setShowPoll(false); setExpanded(false);
      toast.success("Publicado!");
    } catch { toast.error("Erro ao publicar"); }
    setPosting(false);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full rounded-xl border border-dashed border-primary/20 bg-card p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all group"
      >
        <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm">Compartilhe algo com sua equipe...</span>
        </div>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/20 bg-card p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">Nova publicação</h4>
        <button onClick={() => setExpanded(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 100))}
        placeholder="Título (opcional)"
        className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary/50 mb-2 transition-colors"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 500))}
        placeholder={isPro ? "Mensagem para seus pacientes..." : "Como está sua jornada hoje?"}
        rows={3}
        className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary/50 resize-none transition-colors"
      />

      <AnimatePresence>
        {showPoll && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-3 rounded-lg bg-violet-500/5 border border-violet-500/20"
          >
            <input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value.slice(0, 150))}
              placeholder="Pergunta da enquete"
              className="w-full bg-card rounded-lg px-3 py-1.5 text-sm outline-none border border-border mb-2"
            />
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex gap-1 mb-1">
                <input
                  value={opt}
                  onChange={(e) => {
                    const next = [...pollOptions];
                    next[i] = e.target.value;
                    setPollOptions(next);
                  }}
                  placeholder={`Opção ${i + 1}`}
                  className="flex-1 bg-card rounded-lg px-3 py-1.5 text-xs outline-none border border-border"
                />
                {pollOptions.length > 2 && (
                  <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {pollOptions.length < 5 && (
              <button onClick={() => setPollOptions([...pollOptions, ""])} className="text-xs text-primary mt-1 hover:underline">
                + Adicionar opção
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-2">
          {isPro && (
            <button
              onClick={() => setShowPoll(!showPoll)}
              className={`p-2 rounded-lg text-xs transition-colors ${showPoll ? "bg-violet-500/10 text-violet-600" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={handlePost}
          disabled={posting || (!title.trim() && !text.trim())}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <Send className="h-3.5 w-3.5" />
          Publicar
        </button>
      </div>
    </motion.div>
  );
}
