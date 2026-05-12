import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Image, BarChart3, X, Plus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Props {
  userRole?: string;
}

export default function CreateTimelinePost({ userRole }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPro = userRole === "nutritionist" || userRole === "admin";
  const firstName = profile?.full_name?.split(" ")[0] || "Você";
  const initials = (profile?.full_name || "U").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;
    setUploadingImage(true);
    try {
      const ext = imageFile.name.split(".").pop() || "jpg";
      const path = `timeline/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, imageFile);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err) {
      console.error("Upload error:", err);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePost = async () => {
    if (!user || (!title.trim() && !text.trim())) return;
    setPosting(true);
    try {
      let mediaUrl: string | null = null;
      if (imageFile) {
        mediaUrl = await uploadImage();
      }

      const payload: any = {
        workspace_id: user.id,
        author_id: user.id,
        event_type: showPoll ? "poll" : (isPro ? "professional_post" : "patient_post"),
        title: title.trim() || text.trim().slice(0, 60),
        description: text.trim() || null,
        media_url: mediaUrl,
        visibility_scope: "global",
      };
      if (showPoll && pollQuestion.trim()) {
        payload.poll_question = pollQuestion.trim();
        payload.poll_options = pollOptions.filter(o => o.trim());
      }
      await supabase.from("timeline_events").insert(payload);
      queryClient.invalidateQueries({ queryKey: ["timeline-events"] });
      setText(""); setTitle(""); setPollQuestion(""); setPollOptions(["", ""]); setShowPoll(false); setExpanded(false);
      removeImage();
      toast.success("Publicado!");
    } catch { toast.error("Erro ao publicar"); }
    setPosting(false);
  };

  if (!expanded) {
    return (
      <motion.button
        onClick={() => setExpanded(true)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full rounded-2xl border border-border/60 bg-card p-4 text-left hover:border-primary/30 hover:shadow-sm transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-bold text-primary border border-primary/20">
            {initials}
          </div>
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1">
            {isPro ? "Compartilhe algo com seus pacientes..." : "Como está sua jornada hoje?"}
          </span>
          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Image className="h-3.5 w-3.5 text-primary/60" />
            </div>
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <BarChart3 className="h-3.5 w-3.5 text-violet-500/60" />
            </div>
          </div>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-2xl border border-primary/20 bg-card p-5 shadow-lg shadow-primary/5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-bold text-primary border border-primary/20">
            {initials}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{firstName}</h4>
            <p className="text-[11px] text-muted-foreground">Nova publicação</p>
          </div>
        </div>
        <button onClick={() => { setExpanded(false); removeImage(); }} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 100))}
        placeholder="Título (opcional)"
        className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground/50 mb-2"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 500))}
        placeholder={isPro ? "Compartilhe dicas, avisos ou motivação..." : "Como está sua jornada hoje?"}
        rows={3}
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 resize-none leading-relaxed"
        autoFocus
      />

      {/* Image Preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 relative"
          >
            <img src={imagePreview} alt="Preview" className="rounded-xl max-h-48 object-cover w-full border border-border" />
            <button
              onClick={removeImage}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Poll Section */}
      <AnimatePresence>
        {showPoll && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-4 rounded-xl bg-violet-500/5 border border-violet-500/20"
          >
            <input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value.slice(0, 150))}
              placeholder="Pergunta da enquete"
              className="w-full bg-card rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-violet-500/50 mb-3 transition-colors"
            />
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  value={opt}
                  onChange={(e) => {
                    const next = [...pollOptions];
                    next[i] = e.target.value;
                    setPollOptions(next);
                  }}
                  placeholder={`Opção ${i + 1}`}
                  className="flex-1 bg-card rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-violet-500/50 transition-colors"
                />
                {pollOptions.length > 2 && (
                  <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {pollOptions.length < 5 && (
              <button onClick={() => setPollOptions([...pollOptions, ""])} className="text-xs text-violet-500 mt-1 hover:underline font-medium">
                + Adicionar opção
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Bar */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
        <div className="flex gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              imageFile ? "bg-emerald-500/10 text-emerald-600" : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Imagem</span>
          </button>
          {isPro && (
            <button
              onClick={() => setShowPoll(!showPoll)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                showPoll ? "bg-violet-500/10 text-violet-600" : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Enquete</span>
            </button>
          )}
        </div>
        <button
          onClick={handlePost}
          disabled={posting || uploadingImage || (!title.trim() && !text.trim())}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-all shadow-sm"
        >
          {(posting || uploadingImage) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Publicar
        </button>
      </div>
    </motion.div>
  );
}
