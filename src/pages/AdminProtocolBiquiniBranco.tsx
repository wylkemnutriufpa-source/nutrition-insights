import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtocolBBToggle from "@/components/admin/ProtocolBBToggle";
import ProtocolBBDocumentation from "@/components/admin/ProtocolBBDocumentation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, FileText, Sparkles } from "lucide-react";

export default function AdminProtocolBiquiniBranco() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-pink-500" />
            Protocolo Biquíni Branco
          </h1>
          <p className="text-muted-foreground text-sm">Configurações e documentação do protocolo de transformação corporal em 4 fases</p>
        </div>

        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" /> Configuração
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2">
              <FileText className="w-4 h-4" /> Documentação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <ProtocolBBToggle />
          </TabsContent>

          <TabsContent value="docs">
            <ProtocolBBDocumentation />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
