import { useTimelineComments } from "@/hooks/useTimeline";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  eventId: string;
}

export default function TimelineComments({ eventId }: Props) {
  const { comments, isLoading, addComment } = useTimelineComments(eventId);
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addComment(text);
    setText("");
  };

  return (
    <div className="mt-2 pt-2 border-t border-border/50">
      <AnimatePresence>
        {comments.map((c: any) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 mb-2"
          >
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
              U
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-relaxed text-foreground">{c.comment_text}</p>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="flex gap-1.5 mt-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 240))}
          placeholder="Comentar..."
          className="flex-1 bg-muted rounded-lg px-3 py-1.5 text-xs outline-none border border-border focus:border-primary/50 transition-colors"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <Send className="h-3 w-3" />
        </button>
      </form>
    </div>
  );
}
