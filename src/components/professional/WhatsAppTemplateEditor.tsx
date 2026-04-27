import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Save, Info, History } from "lucide-react";
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppBusiness";
import { WhatsAppTemplateType } from "@/utils/invitation";

export default function WhatsAppTemplateEditor() {
  const { templates, saveTemplate, loading } = useWhatsAppTemplates();
  const [activeTab, setActiveTab] = useState<WhatsAppTemplateType>("patient_onboarding");
  const [content, setContent] = useState("");

  // Sync content when tab changes or templates load
  useState(() => {
    if (templates[activeTab]) setContent(templates[activeTab]);
  });

  const handleSave = async () => {
    await saveTemplate(activeTab, content);
  };

  const handleTabChange = (val: string) => {
    const key = val as WhatsAppTemplateType;
    setActiveTab(key);
    setContent(templates[key] || "");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-[#25D366]/30 text-[#128C7E] hover:bg-[#25D366]/10">
          <MessageCircle className="w-4 h-4" /> Configurar Mensagens
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            Editor de Templates WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3 text-xs text-blue-800">
            <Info className="w-4 h-4 shrink-0" />
            <div>
              <p className="font-bold mb-1">Dica de Variáveis:</p>
              <p>Use <strong>{"{{patientName}}"}</strong>, <strong>{"{{professionalName}}"}</strong>, <strong>{"{{clinicName}}"}</strong> e <strong>{"{{url}}"}</strong> para personalizar automaticamente.</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="patient_onboarding">Onboarding</TabsTrigger>
              <TabsTrigger value="patient_invite">Convite</TabsTrigger>
              <TabsTrigger value="quick_link">Link Rápido</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Texto da Mensagem</Label>
                <Textarea 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escreva sua mensagem personalizada aqui..."
                  className="min-h-[200px] font-sans text-sm leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setContent("")}>Limpar</Button>
                <Button onClick={handleSave} className="bg-[#25D366] hover:bg-[#128C7E] gap-2">
                  <Save className="w-4 h-4" /> Salvar Template
                </Button>
              </div>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
