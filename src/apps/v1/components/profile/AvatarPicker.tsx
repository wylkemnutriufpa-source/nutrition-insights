import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Camera, Upload, Smile, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const EMOJI_AVATARS = [
  "😊", "😎", "🤩", "💪", "🏃", "🧘", "🥗", "🍎",
  "🌟", "🔥", "🦁", "🐺", "🦅", "🐬", "🦋", "🌺",
  "🎯", "⚡", "🏆", "💎", "🌈", "🍀", "🌙", "☀️",
];

const PRESET_COLORS = [
  "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
  "bg-teal-500", "bg-cyan-500", "bg-blue-500", "bg-violet-500",
  "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-lime-500",
];

interface AvatarPickerProps {
  currentUrl: string | null;
  onUpdate: (url: string | null) => void;
}

export default function AvatarPicker({ currentUrl, onUpdate }: AvatarPickerProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState("bg-violet-500");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 2MB.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;

      // Remove old file if exists
      await supabase.storage.from("avatars").remove([path]);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
      onUpdate(avatarUrl);
      toast.success("Foto de perfil atualizada!");
    } catch (err: any) {
      toast.error("Erro ao enviar foto: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEmojiSelect = async (emoji: string, colorClass: string) => {
    if (!user) return;
    setSelectedEmoji(emoji);
    setUploading(true);

    try {
      // Create SVG avatar with emoji
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;

      // Background color
      const colorMap: Record<string, string> = {
        "bg-rose-500": "#f43f5e", "bg-orange-500": "#f97316", "bg-amber-500": "#f59e0b",
        "bg-emerald-500": "#10b981", "bg-teal-500": "#14b8a6", "bg-cyan-500": "#06b6d4",
        "bg-blue-500": "#3b82f6", "bg-violet-500": "#8b5cf6", "bg-purple-500": "#a855f7",
        "bg-pink-500": "#ec4899", "bg-indigo-500": "#6366f1", "bg-lime-500": "#84cc16",
      };

      ctx.fillStyle = colorMap[colorClass] || "#8b5cf6";
      ctx.beginPath();
      ctx.arc(128, 128, 128, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "120px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, 128, 136);

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png")
      );

      const path = `${user.id}/avatar.png`;
      await supabase.storage.from("avatars").remove([path]);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/png" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
      onUpdate(avatarUrl);
      toast.success("Avatar atualizado!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    setUploading(true);
    try {
      await supabase.storage.from("avatars").remove([`${user.id}/avatar.png`, `${user.id}/avatar.jpg`, `${user.id}/avatar.jpeg`, `${user.id}/avatar.webp`]);
      await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", user.id);
      onUpdate(null);
      setSelectedEmoji(null);
      toast.success("Foto removida!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const userName = user?.user_metadata?.full_name || "U";

  return (
    <div className="space-y-4">
      {/* Current Avatar Preview */}
      <div className="flex items-center gap-4">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="relative"
        >
          <Avatar className="w-20 h-20 border-2 border-primary/30">
            <AvatarImage src={currentUrl || undefined} />
            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
              {userName[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </motion.div>
        <div className="flex-1">
          <p className="font-medium text-sm">Foto de Perfil</p>
          <p className="text-xs text-muted-foreground">Escolha uma foto, emoji ou avatar</p>
        </div>
        {currentUrl && (
          <Button variant="ghost" size="sm" onClick={handleRemove} disabled={uploading}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="emoji" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="emoji" className="gap-1.5 text-xs">
            <Smile className="w-3.5 h-3.5" /> Emoji / Avatar
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-1.5 text-xs">
            <Camera className="w-3.5 h-3.5" /> Enviar Foto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emoji" className="space-y-3 mt-3">
          {/* Color Picker */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Cor de fundo</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all",
                    color,
                    selectedColor === color
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                      : "opacity-70 hover:opacity-100"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Emoji Grid */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Escolha um emoji</p>
            <div className="grid grid-cols-8 gap-1.5">
              {EMOJI_AVATARS.map((emoji) => (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleEmojiSelect(emoji, selectedColor)}
                  disabled={uploading}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center text-lg",
                    "border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Card
            className="border-dashed border-2 border-border/60 hover:border-primary/40 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <CardContent className="p-6 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Clique para enviar uma foto</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou WEBP • Máximo 2MB</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
