/**
 * Modal de confirmação para "Solicitar destravamento" do modo de experiência.
 * Coleta uma justificativa do usuário e só então abre o cliente de email
 * pré-preenchido com motivo, data prevista e correlation ID.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@v1/components/ui/dialog";
import { Button } from "@v1/components/ui/button";
import { Textarea } from "@v1/components/ui/textarea";
import { Label } from "@v1/components/ui/label";
import { Mail, Lock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  attemptedMode: string;
  blockDescription?: string;
  unlockDate?: string | null;
  correlationId?: string;
}

export default function RequestUnlockDialog({
  attemptedMode,
  blockDescription,
  unlockDate,
  correlationId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [justification, setJustification] = useState("");

  const handleConfirm = () => {
    const trimmed = justification.trim();
    if (trimmed.length < 10) {
      toast.error("Descreva sua justificativa (mínimo 10 caracteres).");
      return;
    }

    const subject = encodeURIComponent("Solicitação de destravamento do modo de experiência");
    const body = encodeURIComponent(
      `Olá,\n\nGostaria de solicitar o destravamento do meu modo de experiência.\n\n` +
        `Modo solicitado: ${attemptedMode}\n` +
        `Motivo informado pelo sistema: ${blockDescription || "—"}\n` +
        (unlockDate
          ? `Data prevista de liberação: ${new Date(unlockDate).toLocaleDateString("pt-BR")}\n`
          : "") +
        (correlationId ? `ID de correlação: ${correlationId}\n` : "") +
        `\nJustificativa do usuário:\n${trimmed}\n\nObrigado!`
    );

    // Log local audit so a record exists even if the email client fails
    try {
      console.info("[ExperienceMode] Unlock request submitted", {
        correlationId,
        attemptedMode,
        justificationLength: trimmed.length,
      });
    } catch {
      /* ignore */
    }

    window.location.href = `mailto:suporte@fitjourney.com.br?subject=${subject}&body=${body}`;
    toast.success("Solicitação preparada. Verifique seu cliente de email.");
    setOpen(false);
    setJustification("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          data-testid="emode-request-unlock"
          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-700 dark:text-amber-400 underline hover:no-underline"
        >
          Solicitar destravamento ao administrador →
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="emode-unlock-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            Solicitar destravamento
          </DialogTitle>
          <DialogDescription>
            Descreva por que você precisa liberar o modo{" "}
            <span className="font-semibold capitalize">{attemptedMode}</span>. O administrador
            receberá esta justificativa por email junto com os detalhes técnicos da tentativa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {blockDescription && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              <strong className="block mb-0.5">Motivo do sistema:</strong>
              {blockDescription}
              {unlockDate && (
                <div className="mt-1 text-[11px] opacity-80">
                  Liberação prevista:{" "}
                  {new Date(unlockDate).toLocaleDateString("pt-BR")}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="justification" className="text-xs">
              Sua justificativa <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="justification"
              data-testid="emode-unlock-justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Ex.: Preciso acessar o painel avançado para configurar automações urgentes do meu consultório."
              rows={4}
              className="resize-none text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Mínimo 10 caracteres. ({justification.trim().length})
            </p>
          </div>

          {correlationId && (
            <p className="text-[10px] text-muted-foreground font-mono">
              ID de correlação: {correlationId}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            data-testid="emode-unlock-cancel"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={justification.trim().length < 10}
            data-testid="emode-unlock-confirm"
            className="gap-1.5"
          >
            <Mail className="w-3.5 h-3.5" />
            Enviar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
