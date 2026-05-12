/**
 * UnblockPatientDialog
 *
 * Lets the professional grant a temporary onboarding override for a linked
 * patient. Calls the SECURITY DEFINER RPC `register_unblock_override`, which
 * enforces the link constraint and clamps the duration between 5 and 240 minutes.
 *
 * After successfully registering the override the dialog:
 *  - Invalidates the patient lifecycle cache so the UI reflects the unblocked
 *    state immediately.
 *  - Optionally opens the patient preview route in a new tab for quick QA.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldOff, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invalidateLifecycleQueries } from "@/lib/lifecycleCache";

interface UnblockPatientDialogProps {
  patientId: string;
  patientName?: string;
  /** Render as compact icon button (default: outline w/ label). */
  compact?: boolean;
}

const DURATION_PRESETS = [
  { value: "15", label: "15 minutos" },
  { value: "60", label: "1 hora" },
  { value: "120", label: "2 horas" },
  { value: "240", label: "4 horas (máx.)" },
];

export default function UnblockPatientDialog({
  patientId,
  patientName,
  compact = false,
}: UnblockPatientDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState("60");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleUnblock(openPreview: boolean) {
    if (!patientId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("register_unblock_override" as any, {
        _patient_id: patientId,
        _reason: reason.trim() || null,
        _duration_minutes: parseInt(duration, 10),
      });
      if (error) throw error;

      invalidateLifecycleQueries(queryClient, patientId);
      toast.success(`Paciente destravado por ${DURATION_PRESETS.find(d => d.value === duration)?.label ?? duration + "min"}`);
      setOpen(false);
      setReason("");

      if (openPreview) {
        navigate(`/preview-patient/${patientId}`);
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("professional_not_linked_to_patient")) {
        toast.error("Você não está vinculado a este paciente");
      } else if (msg.includes("unauthenticated")) {
        toast.error("Sessão expirada. Faça login novamente.");
      } else {
        toast.error(msg || "Erro ao destravar paciente");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button
            variant="outline"
            size="icon"
            title="Destravar paciente"
            className="border-warning/30 text-warning hover:bg-warning/10"
          >
            <ShieldOff className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            className="gap-2 border-warning/40 text-warning hover:bg-warning/10"
          >
            <ShieldOff className="w-4 h-4" /> Destravar paciente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="w-5 h-5 text-warning" />
            Destravar onboarding
          </DialogTitle>
          <DialogDescription>
            Cria um override temporário que permite{" "}
            <strong>{patientName ?? "este paciente"}</strong> visualizar a
            plataforma mesmo se a anamnese estiver incompleta. Use apenas
            quando há um plano publicado e você precisa verificar a tela do
            paciente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unblock-duration">Duração</Label>
            <Select value={duration} onValueChange={setDuration} disabled={submitting}>
              <SelectTrigger id="unblock-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_PRESETS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unblock-reason">
              Motivo <span className="text-muted-foreground">(opcional, fica registrado)</span>
            </Label>
            <Textarea
              id="unblock-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: validar visualização do plano publicado…"
              rows={3}
              disabled={submitting}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleUnblock(false)}
            disabled={submitting}
            className="gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
            Apenas destravar
          </Button>
          <Button
            onClick={() => handleUnblock(true)}
            disabled={submitting}
            className="gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Destravar e abrir preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
