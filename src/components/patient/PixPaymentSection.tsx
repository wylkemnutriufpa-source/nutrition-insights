import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QrCode, Copy, CheckCircle2, CreditCard, Smartphone } from "lucide-react";
import { copyToClipboard } from "@/utils/clipboard";

interface PixConfig {
  id: string;
  plan_label: string;
  plan_type: string;
  amount: number;
  pix_code: string;
  qr_code_url: string | null;
}

export default function PixPaymentSection() {
  const [selectedPlan, setSelectedPlan] = useState<PixConfig | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: pixConfigs, isLoading } = useQuery({
    queryKey: ["pix-payment-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pix_payment_configs")
        .select("*")
        .eq("is_active", true)
        .order("amount", { ascending: true });
      if (error) throw error;
      return data as PixConfig[];
    },
  });

  const copyCode = async (code: string) => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    } else {
      toast.error("Erro ao copiar código PIX");
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  if (isLoading) {
    return (
      <Card className="glass shadow-card">
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pixConfigs || pixConfigs.length === 0) return null;

  return (
    <Card className="glass shadow-card overflow-hidden">
      <div className="h-1 gradient-primary" />
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-primary" />
          Pagamento via PIX
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Selecione o plano e efetue o pagamento instantaneamente
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {pixConfigs.map((cfg) => (
            <button
              key={cfg.id}
              onClick={() => { setSelectedPlan(cfg); setCopied(false); }}
              className={`relative p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                selectedPlan?.id === cfg.id
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border/50 hover:border-primary/40 bg-muted/20"
              }`}
            >
              {selectedPlan?.id === cfg.id && (
                <CheckCircle2 className="absolute top-1.5 right-1.5 w-4 h-4 text-primary" />
              )}
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {cfg.plan_type === "patient_prestige" ? "Prestige" : "Plano"}
              </p>
              <p className="font-display font-bold text-sm mt-0.5">{cfg.plan_label}</p>
              <p className="text-primary font-semibold text-xs mt-1">{formatCurrency(cfg.amount)}</p>
            </button>
          ))}
        </div>

        {/* Payment details */}
        {selectedPlan && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* QR Code */}
            {selectedPlan.qr_code_url ? (
              <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-background border border-border/50">
                <p className="text-xs font-medium text-muted-foreground">
                  Escaneie o QR Code com seu app bancário
                </p>
                <div className="w-48 h-48 rounded-lg overflow-hidden bg-white p-2 shadow-sm">
                  <img
                    src={selectedPlan.qr_code_url}
                    alt={`QR Code PIX - ${selectedPlan.plan_label}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {formatCurrency(selectedPlan.amount)}
                </Badge>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 border border-dashed border-border/50">
                <QrCode className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">QR Code em breve</p>
              </div>
            )}

            {/* Copy-paste code */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Ou copie o código PIX:</p>
              <div className="relative">
                <div className="p-3 pr-20 rounded-lg bg-muted/40 border border-border/50 text-[10px] font-mono break-all leading-relaxed max-h-20 overflow-y-auto">
                  {selectedPlan.pix_code}
                </div>
                <Button
                  size="sm"
                  variant={copied ? "default" : "outline"}
                  className="absolute top-2 right-2 h-7 gap-1.5 text-[10px]"
                  onClick={() => copyCode(selectedPlan.pix_code)}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              Após o pagamento, envie o comprovante para seu nutricionista ativar seu plano.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
