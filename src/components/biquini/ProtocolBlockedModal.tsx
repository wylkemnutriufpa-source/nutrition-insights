import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Lock, Scale, Camera, Upload, AlertTriangle,
  CheckCircle2, ArrowRight, Shield
} from "lucide-react";

interface BlockedEnrollment {
  id: string;
  status: string;
  blocked_reason: string | null;
  current_phase: number;
  next_weight_due_at: string | null;
  next_full_review_due_at: string | null;
}

export default function ProtocolBlockedModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState<BlockedEnrollment | null>(null);
  const [sending, setSending] = useState(false);

  // Weight form
  const [weight, setWeight] = useState("");

  // Photo form
  const [photos, setPhotos] = useState<{ front: File | null; side: File | null; back: File | null }>({
    front: null, side: null, back: null,
  });
  const [previews, setPreviews] = useState<{ front: string; side: string; back: string }>({
    front: "", side: "", back: "",
  });

  const needsWeight = enrollment?.status === "awaiting_weight_update";
  const needsFullReview = enrollment?.status === "awaiting_full_reassessment" || enrollment?.status === "protocol_locked";

  useEffect(() => {
    if (!user) return;

    const checkBlocked = async () => {
      const { data } = await (supabase as any)
        .from("program_enrollments")
        .select("id, status, blocked_reason, current_phase, next_weight_due_at, next_full_review_due_at")
        .eq("patient_id", user.id)
        .in("status", ["awaiting_weight_update", "awaiting_full_reassessment", "protocol_locked"])
        .limit(1);

      if (data && data.length > 0) {
        setEnrollment(data[0]);
      } else {
        setEnrollment(null);
      }
    };

    checkBlocked();
    const interval = setInterval(checkBlocked, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handlePhotoChange = (position: "front" | "side" | "back", file: File | null) => {
    if (!file) return;
    setPhotos(prev => ({ ...prev, [position]: file }));
    setPreviews(prev => ({ ...prev, [position]: URL.createObjectURL(file) }));
  };

  const uploadPhoto = async (file: File, position: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${enrollment!.id}/${position}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("enrollment-photos").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = await supabase.storage.from("enrollment-photos").createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  };

  const handleSubmit = async () => {
    if (!user || !enrollment) return;

    if (needsWeight && !weight) {
      toast.error("Informe seu peso atual");
      return;
    }
    if (needsFullReview) {
      if (!weight) { toast.error("Informe seu peso atual"); return; }
      if (!photos.front || !photos.side || !photos.back) {
        toast.error("Envie as 3 fotos corporais (frente, lado e costas)");
        return;
      }
    }

    setSending(true);
    try {
      const now = new Date();
      const updateData: any = {
        last_weight_at: now.toISOString(),
      };

      // If full review, upload photos
      if (needsFullReview && photos.front && photos.side && photos.back) {
        const [frontUrl, sideUrl, backUrl] = await Promise.all([
          uploadPhoto(photos.front, "front"),
          uploadPhoto(photos.side, "side"),
          uploadPhoto(photos.back, "back"),
        ]);

        // Save enrollment photos
        await (supabase as any).from("enrollment_photos").insert({
          enrollment_id: enrollment.id,
          patient_id: user.id,
          phase: enrollment.current_phase,
          photo_front_url: frontUrl,
          photo_side_url: sideUrl,
          photo_back_url: backUrl,
        });

        updateData.last_photos_at = now.toISOString();
      }

      // Determine new status — go back to active protocol
      const activeStatus = `protocol_${enrollment.current_phase}_active`;
      updateData.status = activeStatus;
      updateData.blocked_reason = null;
      updateData.next_weight_due_at = new Date(now.getTime() + 15 * 86400000).toISOString();
      updateData.next_full_review_due_at = new Date(now.getTime() + 30 * 86400000).toISOString();

      await (supabase as any)
        .from("program_enrollments")
        .update(updateData)
        .eq("id", enrollment.id);

      // Create checkin record
      const { data: npData } = await supabase
        .from("nutritionist_patients")
        .select("nutritionist_id")
        .eq("patient_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (npData) {
        await supabase.from("patient_checkins").insert({
          patient_id: user.id,
          nutritionist_id: npData.nutritionist_id,
          weight: parseFloat(weight),
          feedback: needsFullReview
            ? "Envio obrigatório — reavaliação completa do Projeto Biquíni Branco"
            : "Envio obrigatório — atualização de peso do Projeto Biquíni Branco",
          difficulty: "medium",
          status: "pending",
          ...(needsFullReview && photos.front && photos.side && photos.back ? {
            photo_front_url: previews.front,
            photo_side_url: previews.side,
            photo_back_url: previews.back,
          } : {}),
        });
      }

      toast.success("Dados enviados com sucesso! Protocolo desbloqueado! 🎉");
      setEnrollment(null);
      setWeight("");
      setPhotos({ front: null, side: null, back: null });
      setPreviews({ front: "", side: "", back: "" });
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar dados");
    } finally {
      setSending(false);
    }
  };

  if (!enrollment) return null;

  const PHASE_NAMES = ["", "Reset Metabólico", "Déficit Estratégico", "Definição Corporal", "Manutenção Inteligente"];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      >
        {/* Backdrop — no click to dismiss */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 p-6 text-white relative overflow-hidden">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"
            />

            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 10 }}
                className="flex items-center gap-3 mb-3"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">Protocolo Bloqueado</h2>
                  <p className="text-white/80 text-sm">
                    Fase {enrollment.current_phase}: {PHASE_NAMES[enrollment.current_phase]}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/10 rounded-xl p-3 mt-3"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm">
                    {enrollment.blocked_reason || (
                      needsWeight
                        ? "Seu prazo para enviar o peso chegou. Envie agora para continuar no programa."
                        : "Envie seu peso atualizado e fotos corporais para desbloquear seu protocolo e continuar evoluindo."
                    )}
                  </p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 space-y-5">
            {/* Weight */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2"
            >
              <Label className="flex items-center gap-2 font-semibold">
                <Scale className="w-4 h-4 text-primary" /> Peso Atual (kg) *
              </Label>
              <Input
                type="number"
                step="0.1"
                placeholder="Ex: 65.5"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                className="text-lg font-semibold h-12"
              />
            </motion.div>

            {/* Photos (only for full review / locked) */}
            {needsFullReview && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3"
              >
                <Label className="flex items-center gap-2 font-semibold">
                  <Camera className="w-4 h-4 text-primary" /> Fotos Corporais *
                </Label>
                <p className="text-xs text-muted-foreground">
                  Envie fotos de frente, lado e costas para sua reavaliação completa.
                </p>

                <div className="grid grid-cols-3 gap-3">
                  {(["front", "side", "back"] as const).map(pos => (
                    <div key={pos} className="space-y-1">
                      <p className="text-xs text-center font-medium capitalize">
                        {pos === "front" ? "Frente" : pos === "side" ? "Lado" : "Costas"}
                      </p>
                      <label className={`flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                        previews[pos]
                          ? "border-primary/50 bg-primary/5"
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      }`}>
                        {previews[pos] ? (
                          <img
                            src={previews[pos]}
                            alt={pos}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                            <span className="text-[10px] text-muted-foreground">Enviar</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={e => handlePhotoChange(pos, e.target.files?.[0] || null)}
                        />
                      </label>
                      {previews[pos] && (
                        <div className="flex justify-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Submit */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                onClick={handleSubmit}
                disabled={sending || !weight || (needsFullReview && (!photos.front || !photos.side || !photos.back))}
                className="w-full h-12 bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 gap-2 font-semibold text-base"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    {needsFullReview ? "Enviar Peso e Fotos" : "Enviar Peso"}
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Você só poderá acessar o sistema após enviar os dados obrigatórios.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}