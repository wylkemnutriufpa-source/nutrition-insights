import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Sparkles, Instagram, Copy, Download, RefreshCw, Eye,
  Wand2, CheckCircle, Clock, FileText, ArrowLeft,
} from "lucide-react";
import { MagicSlideButton } from "@/components/common/MagicSlideGenerator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface MarketingAsset {
  id: string;
  feature_id: string;
  slide_data: Record<string, any>;
  post_instagram_data: Record<string, any>;
  post_image_prompt: string | null;
  caption: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  feature_registry?: {
    name: string;
    short_description: string;
    icon_name: string;
    gradient: string;
    emoji: string;
    category: string;
    is_premium: boolean;
    status: string;
  };
}

export default function AdminMarketingContent() {
  const qc = useQueryClient();
  const [previewAsset, setPreviewAsset] = useState<MarketingAsset | null>(null);
  const [editingCaption, setEditingCaption] = useState<{ id: string; caption: string } | null>(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["marketing-assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_marketing_assets")
        .select("*, feature_registry(name, short_description, icon_name, gradient, emoji, category, is_premium, status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MarketingAsset[];
    },
  });

  const { data: features = [] } = useQuery({
    queryKey: ["features-without-marketing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_registry")
        .select("id, name, emoji, category")
        .in("status", ["active", "beta"])
        .order("name");
      if (error) throw error;
      // filter out those that already have assets
      const existingIds = new Set(assets.map((a) => a.feature_id));
      return (data ?? []).filter((f: any) => !existingIds.has(f.id));
    },
    enabled: assets.length >= 0,
  });

  const generateMutation = useMutation({
    mutationFn: async (featureId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-feature-marketing", {
        body: { feature_id: featureId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Conteúdo de marketing gerado com sucesso!");
      qc.invalidateQueries({ queryKey: ["marketing-assets"] });
      qc.invalidateQueries({ queryKey: ["features-without-marketing"] });
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const updateCaptionMutation = useMutation({
    mutationFn: async ({ id, caption }: { id: string; caption: string }) => {
      const { error } = await supabase
        .from("feature_marketing_assets")
        .update({ caption, edited_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Legenda atualizada!");
      setEditingCaption(null);
      qc.invalidateQueries({ queryKey: ["marketing-assets"] });
    },
  });

  const copyCaption = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Legenda copiada!");
  };

  const statusIcon = (s: string) =>
    s === "published" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />;
  const statusColor = (s: string) =>
    s === "published" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400";

  const navigate = useNavigate();

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Back + Header */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Instagram className="w-6 h-6 text-primary" />
            Central de Conteúdo FitJourney
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Geração automática de conteúdo de marketing a partir dos recursos do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MagicSlideButton />
          <Badge variant="outline" className="gap-1">
            <FileText className="w-3 h-3" />
            {assets.length} posts gerados
          </Badge>
        </div>
      </div>

      {/* Generate for features without assets */}
      {features.length > 0 && (
        <Card className="border-dashed border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              Recursos sem conteúdo de marketing ({features.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {features.map((f: any) => (
                <Button
                  key={f.id}
                  size="sm"
                  variant="outline"
                  onClick={() => generateMutation.mutate(f.id)}
                  disabled={generateMutation.isPending}
                  className="gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  {f.emoji} {f.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assets grid */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
      ) : assets.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-muted-foreground">Nenhum conteúdo gerado ainda</p>
          <p className="text-xs text-muted-foreground mt-1">
            Clique em um recurso acima para gerar automaticamente
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {assets.map((asset) => {
            const feat = asset.feature_registry;
            const ig = asset.post_instagram_data || {};
            return (
              <Card key={asset.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Instagram preview card */}
                <div className="bg-gradient-to-br from-background to-muted p-4 border-b">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{feat?.emoji}</span>
                      <span className="font-medium text-sm truncate">{feat?.name}</span>
                    </div>
                    <Badge className={statusColor(asset.status)}>
                      {statusIcon(asset.status)} {asset.status}
                    </Badge>
                  </div>

                  {/* Mini IG preview */}
                  <div className="bg-card rounded-lg p-3 space-y-2 border">
                    <p className="font-bold text-sm leading-tight">{ig.headline || "—"}</p>
                    <p className="text-xs text-muted-foreground">{ig.subtitle || ""}</p>
                    {Array.isArray(ig.bullets) && (
                      <ul className="text-xs space-y-1">
                        {ig.bullets.map((b: string, i: number) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-primary mt-0.5">✦</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    {ig.closing_phrase && (
                      <p className="text-xs font-medium text-primary italic">{ig.closing_phrase}</p>
                    )}
                  </div>
                </div>

                <CardContent className="p-3 space-y-2">
                  {/* Caption preview */}
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {asset.caption || "Sem legenda"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="ghost" className="flex-1 gap-1 text-xs"
                      onClick={() => setPreviewAsset(asset)}>
                      <Eye className="w-3 h-3" /> Ver
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1 gap-1 text-xs"
                      onClick={() => asset.caption && copyCaption(asset.caption)}>
                      <Copy className="w-3 h-3" /> Copiar
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1 gap-1 text-xs"
                      onClick={() => generateMutation.mutate(asset.feature_id)}
                      disabled={generateMutation.isPending}>
                      <RefreshCw className="w-3 h-3" /> Regerar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {previewAsset && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-xl">{previewAsset.feature_registry?.emoji}</span>
                  {previewAsset.feature_registry?.name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Internal slide */}
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Slide Interno
                  </h3>
                  <Card className="p-4 bg-gradient-to-br from-background to-muted">
                    <p className="text-lg font-bold">{previewAsset.slide_data?.headline}</p>
                    <p className="text-sm text-muted-foreground">{previewAsset.slide_data?.subtitle}</p>
                    {Array.isArray(previewAsset.slide_data?.bullets) && (
                      <ul className="mt-2 space-y-1">
                        {previewAsset.slide_data.bullets.map((b: string, i: number) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-primary">•</span> {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    {previewAsset.slide_data?.cta && (
                      <Badge className="mt-3 bg-primary">{previewAsset.slide_data.cta}</Badge>
                    )}
                  </Card>
                </div>

                {/* Instagram post */}
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <Instagram className="w-4 h-4 text-pink-500" /> Post Instagram
                  </h3>
                  <Card className="p-4 aspect-square max-w-sm mx-auto flex flex-col justify-center items-center text-center bg-gradient-to-br from-emerald-950 to-background border-primary/20">
                    <p className="text-xl font-bold bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent">
                      {previewAsset.post_instagram_data?.headline}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {previewAsset.post_instagram_data?.subtitle}
                    </p>
                    {Array.isArray(previewAsset.post_instagram_data?.bullets) && (
                      <ul className="mt-4 space-y-1.5 text-left w-full max-w-[280px]">
                        {previewAsset.post_instagram_data.bullets.map((b: string, i: number) => (
                          <li key={i} className="text-xs flex gap-2 items-start">
                            <span className="text-primary font-bold">✦</span> {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    {previewAsset.post_instagram_data?.closing_phrase && (
                      <p className="mt-4 text-xs italic text-primary/80">
                        {previewAsset.post_instagram_data.closing_phrase}
                      </p>
                    )}
                    {previewAsset.post_instagram_data?.cta && (
                      <p className="mt-3 text-xs font-bold text-primary">
                        {previewAsset.post_instagram_data.cta}
                      </p>
                    )}
                  </Card>
                </div>

                {/* Caption */}
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" /> Legenda
                  </h3>
                  {editingCaption?.id === previewAsset.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingCaption.caption}
                        onChange={(e) => setEditingCaption({ ...editingCaption, caption: e.target.value })}
                        rows={4}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() =>
                          updateCaptionMutation.mutate({ id: editingCaption.id, caption: editingCaption.caption })
                        }>Salvar</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingCaption(null)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm whitespace-pre-wrap">{previewAsset.caption || "Sem legenda"}</p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="gap-1"
                          onClick={() => setEditingCaption({ id: previewAsset.id, caption: previewAsset.caption || "" })}>
                          Editar
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1"
                          onClick={() => previewAsset.caption && copyCaption(previewAsset.caption)}>
                          <Copy className="w-3 h-3" /> Copiar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Image prompt */}
                {previewAsset.post_image_prompt && (
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                      <Download className="w-4 h-4" /> Prompt de Imagem
                    </h3>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground font-mono">{previewAsset.post_image_prompt}</p>
                      <Button size="sm" variant="outline" className="mt-2 gap-1"
                        onClick={() => copyCaption(previewAsset.post_image_prompt!)}>
                        <Copy className="w-3 h-3" /> Copiar prompt
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
