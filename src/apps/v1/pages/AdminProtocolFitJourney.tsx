import DashboardLayout from "@v1/components/layout/DashboardLayout";
import ProtocolFitJourneyToggle from "@v1/components/admin/ProtocolFitJourneyToggle";
import ProtocolMasterDocumentation from "@v1/components/admin/ProtocolMasterDocumentation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { Settings, FileText } from "lucide-react";

export default function AdminProtocolFitJourney() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Protocolo FitJourney</h1>
          <p className="text-muted-foreground text-sm">Configurações e documentação do motor clínico determinístico</p>
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
            <ProtocolFitJourneyToggle />
          </TabsContent>

          <TabsContent value="docs">
            <ProtocolMasterDocumentation />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
