import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Mail, MessageCircle, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildPremiumMealPlanHTML, type PremiumMealPlanPDFData } from "@/lib/pdfExportPremium";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PremiumMealPlanPDFData | null;
}

export default function SharePlanDialog({ open, onOpenChange, data }: Props) {
  const [loading, setLoading] = useState<null | "link" | "email" | "whatsapp">(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [clipboardError, setClipboardError] = useState(false);
  const [contact, setContact] = useState("");

  const generateAndUpload = async (): Promise<string> => {
    if (!data) throw new Error("Sem dados do plano");
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) throw new Error("Usuário não autenticado");

    const html = buildPremiumMealPlanHTML(data);
    const blob = new Blob([html], { type: "text/html; charset=utf-8" });
    const slug = (data.patientName || "paciente").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const path = `${userId}/${slug}-${Date.now()}.html`;

    const { error } = await supabase.storage
      .from("shared-meal-plans")
      .upload(path, blob, { contentType: "text/html; charset=utf-8", upsert: true });
    if (error) throw error;

    const { data: pub } = supabase.storage.from("shared-meal-plans").getPublicUrl(path);
    return pub.publicUrl;
  };

  const handleAction = async (mode: "link" | "email" | "whatsapp") => {
    setLoading(mode);
    try {
      const url = shareUrl ?? (await generateAndUpload());
      setShareUrl(url);

      const subject = `Seu Plano Alimentar - ${data?.patientName ?? ""}`.trim();
      const message = `Olá${data?.patientName ? `, ${data.patientName}` : ""}! Aqui está seu plano alimentar: ${url}`;

      if (mode === "link") {
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setClipboardError(false);
            setTimeout(() => setCopied(false), 2500);
            toast.success("Link copiado para a área de transferência!");
          } else {
            throw new Error("Clipboard API not available");
          }
        } catch (err) {
          console.warn("Clipboard API blocked, showing fallback", err);
          setClipboardError(true);
          toast.error("Permissão de cópia bloqueada", {
            description: "O link foi gerado abaixo para cópia manual."
          });
        }
      } else if (mode === "email") {
        const to = encodeURIComponent(contact.trim());
        window.open(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`, "_blank");
        toast.success("Abrindo seu cliente de e-mail...");
      } else if (mode === "whatsapp") {
        const phone = contact.replace(/\D/g, "");
        const wa = phone
          ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
          : `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(wa, "_blank");
        toast.success("Abrindo WhatsApp...");
      }
    } catch (err: any) {
      console.error("Erro ao compartilhar:", err);
      toast.error(err?.message || "Erro ao gerar link de compartilhamento");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar plano para o paciente</DialogTitle>
          <DialogDescription>
            Escolha como deseja compartilhar o plano alimentar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact">E-mail ou WhatsApp do paciente (opcional)</Label>
            <Input
              id="contact"
              placeholder="email@exemplo.com ou +55 11 99999-9999"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Se vazio, abrirá o app permitindo escolher o destinatário.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleAction("link")}
              disabled={!!loading}
            >
              {loading === "link" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : copied ? (
                <Check className="w-4 h-4 mr-2 text-emerald-500" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              {copied ? "Link copiado!" : "Gerar e copiar link"}
            </Button>

            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleAction("whatsapp")}
              disabled={!!loading}
            >
              {loading === "whatsapp" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4 mr-2 text-emerald-500" />
              )}
              Enviar pelo WhatsApp
            </Button>

            <Button
              variant="outline"
              className="justify-start"
              onClick={() => handleAction("email")}
              disabled={!!loading}
            >
              {loading === "email" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2 text-blue-500" />
              )}
              Enviar por e-mail
            </Button>
          </div>

          {shareUrl && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Link público
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs truncate">{shareUrl}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                    toast.success("Link copiado!");
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
