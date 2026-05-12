import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { AlertTriangle, Send, Lock } from "lucide-react";
import { usePrestige } from "@/hooks/usePrestige";
import { Badge } from "@/components/ui/badge";

const SOS_CATEGORIES = [
  { key: "plan_doubt", label: "Dúvidas no plano alimentar" },
  { key: "protocol_doubt", label: "Dúvidas no protocolo" },
  { key: "supplement_doubt", label: "Dúvidas sobre suplementação" },
  { key: "side_effects", label: "Efeitos colaterais / mal-estar" },
  { key: "other", label: "Outra dúvida (descreva abaixo)" },
];

interface SOSModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SOSModal({ open, onOpenChange }: SOSModalProps) {
  const { user } = useAuth();
  const { prestige } = usePrestige();
  const [selected, setSelected] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  const isPremium = !!prestige.plan;

  const toggle = (key: string) => {
    setSelected((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const handleSend = async () => {
    if (!user || selected.length === 0) return;
    setSending(true);

    // Get nutritionist from nutritionist_patients
    const { data: rel } = await supabase
      .from("nutritionist_patients")
      .select("nutritionist_id")
      .eq("patient_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("sos_tickets").insert({
      patient_id: user.id,
      nutritionist_id: rel?.nutritionist_id || null,
      category: selected.join(","),
      description: description.trim() || null,
    });

    if (error) {
      toast.error("Erro ao enviar SOS");
    } else {
      toast.success("🆘 SOS enviado! Seu profissional será notificado.");
      setSelected([]);
      setDescription("");
      onOpenChange(false);
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            SOS - Preciso de Ajuda
          </DialogTitle>
          <DialogDescription>
            Selecione o tipo de ajuda que precisa. Seu nutricionista será notificado imediatamente.
          </DialogDescription>
        </DialogHeader>

        {!isPremium ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-semibold">Recurso Premium</p>
            <p className="text-sm text-muted-foreground">
              O SOS é exclusivo para pacientes com plano Prestígio ativo. Fale com seu nutricionista para ativar.
            </p>
            <Badge variant="outline" className="mt-1">⭐ Premium</Badge>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {SOS_CATEGORIES.map((cat) => (
                <div key={cat.key} className="flex items-center gap-3">
                  <Checkbox
                    id={cat.key}
                    checked={selected.includes(cat.key)}
                    onCheckedChange={() => toggle(cat.key)}
                  />
                  <Label htmlFor={cat.key} className="text-sm cursor-pointer">{cat.label}</Label>
                </div>
              ))}
            </div>

            {selected.includes("other") && (
              <Textarea
                placeholder="Descreva sua dúvida ou problema..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                className="mt-2"
              />
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={handleSend}
                disabled={sending || selected.length === 0}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              >
                <Send className="w-4 h-4" />
                {sending ? "Enviando..." : "Enviar SOS"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
