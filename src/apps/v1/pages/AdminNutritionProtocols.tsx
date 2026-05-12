import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { BookOpen, BarChart3, Settings } from "lucide-react";
import NutritionProtocolLibrary from "@v1/components/protocols/NutritionProtocolLibrary";
import NutritionProtocolPerformance from "@v1/components/protocols/NutritionProtocolPerformance";

export default function AdminNutritionProtocols() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Biblioteca de Protocolos Nutricionais</h1>
          <p className="text-muted-foreground text-sm">
            Protocolos clínicos estruturados com adaptação metabólica e comportamental
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
            NUTRITION_PROTOCOL_LIBRARY v1.0.0 · THERAPEUTIC_TEMPLATE_MODEL: structured_protocol_system_v1
          </p>
        </div>

        <Tabs defaultValue="library" className="space-y-4">
          <TabsList>
            <TabsTrigger value="library" className="gap-2">
              <BookOpen className="w-4 h-4" /> Biblioteca
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <BarChart3 className="w-4 h-4" /> Performance Clínica
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library">
            <NutritionProtocolLibrary />
          </TabsContent>

          <TabsContent value="performance">
            <NutritionProtocolPerformance />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
