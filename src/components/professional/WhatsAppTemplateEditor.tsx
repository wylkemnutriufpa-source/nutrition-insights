import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Save, Info, Eye, Smartphone } from "lucide-react";
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppBusiness";
import { WhatsAppTemplateType, getWhatsAppInvitationMessage } from "@/utils/invitation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function WhatsAppTemplateEditor() {
  const { user } = useAuth();
  const { templates, saveTemplate, loading } = useWhatsAppTemplates();
  const [activeTab, setActiveTab] = useState<WhatsAppTemplateType>("patient_onboarding");
  const [content, setContent] = useState("");
  const [profData, setProfData] = useState({ name: "Dr. Wylkem Raiol", clinic: "" });

  // Load professional data for realistic preview
  useMemo(() => {
    if (!user?.id) return;
    const fetchProfData = async () => {
      const { data: profProfile } = await supabase.from("professional_profiles").select("clinic_name").eq("user_id", user.id).maybeSingle();
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      
      setProfData({
        name: profile?.full_name || "",
        clinic: profProfile?.clinic_name || ""
      });
    };
    fetchProfData();
  }, [user?.id]);

  // Sync content when tab changes or templates load
  useMemo(() => {
    if (templates[activeTab]) setContent(templates[activeTab]);
    else setContent("");
  }, [activeTab, templates]);

  const handleSave = async () => {
    await saveTemplate(activeTab, content);
  };

  const handleTabChange = (val: string) => {
    const key = val as WhatsAppTemplateType;
    setActiveTab(key);
  };

  const previewMessage = useMemo(() => {
    return getWhatsAppInvitationMessage({
      patientName: "João Silva",
      professionalName: profData.name || "Dr. Wylkem Raiol",
      clinicName: profData.clinic,
      invitationCode: "ABC123",
      professionalId: user?.id,
      templateType: activeTab,
      customTemplate: content
    });
  }, [activeTab, content, profData, user?.id]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-[#25D366]/30 text-[#128C7E] hover:bg-[#25D366]/10">
          <MessageCircle className="w-4 h-4" /> Configurar Mensagens
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            Editor de Templates WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3 text-[11px] text-blue-800">
              <Info className="w-4 h-4 shrink-0" />
              <div>
                <p className="font-bold mb-1">Dica de Variáveis:</p>
                <p>Use <strong>{"{{patientName}}"}</strong>, <strong>{"{{professionalName}}"}</strong>, <strong>{"{{clinicName}}"}</strong> e <strong>{"{{url}}"}</strong>.</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="patient_onboarding" className="text-xs">Onboarding</TabsTrigger>
                <TabsTrigger value="patient_invite" className="text-xs">Convite</TabsTrigger>
                <TabsTrigger value="quick_link" className="text-xs">Link Rápido</TabsTrigger>
              </TabsList>
              
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Texto do Template</Label>
                  <Textarea 
                    value={content} 
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Escreva sua mensagem personalizada aqui..."
                    className="min-h-[250px] font-sans text-sm leading-relaxed"
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Deixe em branco para usar o texto padrão do sistema.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setContent("")}>Restaurar Padrão</Button>
                  <Button onClick={handleSave} disabled={loading} size="sm" className="bg-[#25D366] hover:bg-[#128C7E] gap-2">
                    {loading ? "Salvando..." : <><Save className="w-4 h-4" /> Salvar Template</>}
                  </Button>
                </div>
              </div>
            </Tabs>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> Visualização Real
              </Label>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                Simulação de Envio
              </Badge>
            </div>

            <div className="relative bg-[#e5ddd5] rounded-2xl p-4 min-h-[400px] border border-border/50 overflow-hidden shadow-inner">
              <div className="absolute top-0 left-0 right-0 h-10 bg-[#075e54] flex items-center px-4 gap-3 z-10">
                <Smartphone className="w-4 h-4 text-white/70" />
                <span className="text-white text-xs font-medium">WhatsApp Preview</span>
              </div>
              
              <div className="mt-10 space-y-4 relative z-0">
                <div className="bg-white rounded-lg p-3 shadow-sm max-w-[85%] relative ml-0 text-sm leading-relaxed whitespace-pre-wrap">
                  {previewMessage}
                  <div className="absolute -left-2 top-2 w-0 h-0 border-t-[8px] border-t-transparent border-r-[12px] border-r-white border-b-[8px] border-b-transparent" />
                  <div className="text-[10px] text-muted-foreground text-right mt-1">12:00</div>
                </div>
              </div>

              {/* Mock fallback visual for empty clinic */}
              {!profData.clinic && (
                <div className="mt-8 p-2 bg-amber-50 border border-amber-100 rounded-md text-[10px] text-amber-800 flex gap-2">
                  <Info className="w-3 h-3 shrink-0" />
                  <p><strong>Nota:</strong> Como você não definiu o nome da clínica no seu perfil, o sistema usará o fallback automático (omitindo a parte da clínica) para manter a mensagem elegante.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}