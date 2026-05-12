import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { QrCode, Plus, Save, Trash2, Upload, Image, Loader2, Smartphone } from "lucide-react";

interface PixConfig {
  id: string;
  plan_label: string;
  plan_type: string;
  amount: number;
  pix_code: string;
  qr_code_url: string | null;
  is_active: boolean;
}

export default function PixConfigManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: configs, isLoading } = useQuery({
    queryKey: ["admin-pix-configs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("pix_payment_configs")
        .select("*")
        .eq("nutritionist_id", user.id)
        .order("amount", { ascending: true });
      if (error) throw error;
      return data as PixConfig[];
    },
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Configurações PIX
          </CardTitle>
          <Button size="sm" className="gap-1.5" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4" /> Novo Plano
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Gerencie os QR Codes e códigos PIX de cada plano
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {showAddForm && (
          <PixConfigForm
            onCancel={() => setShowAddForm(false)}
            onSaved={() => {
              setShowAddForm(false);
              queryClient.invalidateQueries({ queryKey: ["admin-pix-configs"] });
            }}
          />
        )}

        {configs?.map((cfg) =>
          editingId === cfg.id ? (
            <PixConfigForm
              key={cfg.id}
              config={cfg}
              onCancel={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                queryClient.invalidateQueries({ queryKey: ["admin-pix-configs"] });
              }}
            />
          ) : (
            <PixConfigCard
              key={cfg.id}
              config={cfg}
              formatCurrency={formatCurrency}
              onEdit={() => setEditingId(cfg.id)}
              onToggle={async (active) => {
                await supabase.from("pix_payment_configs").update({ is_active: active }).eq("id", cfg.id);
                queryClient.invalidateQueries({ queryKey: ["admin-pix-configs"] });
                toast.success(active ? "Plano ativado" : "Plano desativado");
              }}
            />
          )
        )}

        {!isLoading && configs?.length === 0 && !showAddForm && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum plano PIX configurado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PixConfigCard({
  config,
  formatCurrency,
  onEdit,
  onToggle,
}: {
  config: PixConfig;
  formatCurrency: (v: number) => string;
  onEdit: () => void;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20">
      {config.qr_code_url ? (
        <img src={config.qr_code_url} alt="QR" className="w-12 h-12 rounded-lg object-contain bg-white p-0.5" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center">
          <QrCode className="w-5 h-5 text-muted-foreground/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{config.plan_label}</p>
          <Badge variant={config.is_active ? "default" : "secondary"} className="text-[10px]">
            {config.is_active ? "Ativo" : "Inativo"}
          </Badge>
          {!config.qr_code_url && (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
              Sem QR
            </Badge>
          )}
        </div>
        <p className="text-xs text-primary font-semibold">{formatCurrency(config.amount)}</p>
        <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{config.pix_code.slice(0, 40)}…</p>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={config.is_active} onCheckedChange={onToggle} />
        <Button size="sm" variant="ghost" onClick={onEdit}>
          Editar
        </Button>
      </div>
    </div>
  );
}

function PixConfigForm({
  config,
  onCancel,
  onSaved,
}: {
  config?: PixConfig;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(config?.plan_label || "");
  const [planType, setPlanType] = useState(config?.plan_type || "subscription");
  const [amount, setAmount] = useState(config?.amount?.toString() || "");
  const [pixCode, setPixCode] = useState(config?.pix_code || "");
  const [qrUrl, setQrUrl] = useState(config?.qr_code_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleUploadQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `pix-qrcodes/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("message-attachments").upload(path, file);
      if (error) throw error;

      const { data } = supabase.storage.from("message-attachments").getPublicUrl(path);
      setQrUrl(data.publicUrl);
      toast.success("QR Code enviado!");
    } catch (err: any) {
      toast.error("Erro no upload: " + (err?.message || "Tente novamente"));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!label.trim() || !amount || !pixCode.trim()) {
      toast.error("Preencha nome, valor e código PIX");
      return;
    }

    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Valor inválido");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Usuário não autenticado"); setSaving(false); return; }
      const payload = {
        plan_label: label.trim(),
        plan_type: planType,
        amount: parsedAmount,
        pix_code: pixCode.trim(),
        qr_code_url: qrUrl || null,
        nutritionist_id: user.id,
      };

      if (config) {
        const { error } = await supabase
          .from("pix_payment_configs")
          .update(payload)
          .eq("id", config.id);
        if (error) throw error;
        toast.success("Plano atualizado!");
      } else {
        const { error } = await supabase
          .from("pix_payment_configs")
          .insert({ ...payload, is_active: true });
        if (error) throw error;
        toast.success("Plano criado!");
      }
      onSaved();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-3 animate-in fade-in slide-in-from-top-2">
      <p className="text-sm font-semibold">{config ? "Editar Plano" : "Novo Plano PIX"}</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nome do Plano</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Profissional" />
        </div>
        <div>
          <Label className="text-xs">Valor (R$)</Label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="74.90" type="number" step="0.01" min="0" />
        </div>
      </div>

      <div>
        <Label className="text-xs">Tipo do Plano</Label>
        <select
          value={planType}
          onChange={(e) => setPlanType(e.target.value)}
          className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="subscription">Assinatura Profissional</option>
          <option value="patient_prestige">Paciente Prestige</option>
        </select>
      </div>

      <div>
        <Label className="text-xs">Código PIX (Copia e Cola)</Label>
        <Textarea
          value={pixCode}
          onChange={(e) => setPixCode(e.target.value)}
          placeholder="Cole aqui o código PIX completo..."
          rows={3}
          className="font-mono text-xs"
        />
      </div>

      <div>
        <Label className="text-xs">QR Code</Label>
        <div className="flex items-center gap-3 mt-1">
          {qrUrl ? (
            <img src={qrUrl} alt="QR Code" className="w-20 h-20 rounded-lg object-contain bg-white p-1 border" />
          ) : (
            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
              <Image className="w-6 h-6 text-muted-foreground/40" />
            </div>
          )}
          <div className="flex-1 space-y-2">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadQr} disabled={uploading} />
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Enviando..." : "Subir imagem QR"}
              </div>
            </label>
            <div>
              <Input
                value={qrUrl}
                onChange={(e) => setQrUrl(e.target.value)}
                placeholder="Ou cole a URL da imagem..."
                className="text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5 gradient-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
