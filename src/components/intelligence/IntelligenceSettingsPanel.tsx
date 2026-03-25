/**
 * Intelligence Settings Panel — Premium golden configuration hub
 * for nutritionists to fully customize the FitJourney Intelligence engine.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, MessageSquare, HelpCircle, Settings2, Sparkles, Users } from "lucide-react";
import IntelligenceGoldenHeader from "./settings/IntelligenceGoldenHeader";
import IntelligenceGeneralSettings from "./settings/IntelligenceGeneralSettings";
import IntelligenceCustomPrompts from "./settings/IntelligenceCustomPrompts";
import IntelligenceCustomQuestions from "./settings/IntelligenceCustomQuestions";
import IntelligenceActiveUsers from "./settings/IntelligenceActiveUsers";
import IntelligenceParticles from "./settings/IntelligenceParticles";

export default function IntelligenceSettingsPanel() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="relative space-y-6 pb-10">
      {/* Background particles */}
      <IntelligenceParticles />

      {/* Golden Header */}
      <IntelligenceGoldenHeader />

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-background/80 backdrop-blur-sm border border-amber-500/20 p-1">
            <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600">
              <Settings2 className="w-4 h-4" /> Configurações
            </TabsTrigger>
            <TabsTrigger value="prompts" className="gap-2 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600">
              <MessageSquare className="w-4 h-4" /> Mensagens
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-2 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600">
              <HelpCircle className="w-4 h-4" /> Perguntas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <IntelligenceGeneralSettings />
          </TabsContent>

          <TabsContent value="prompts">
            <IntelligenceCustomPrompts />
          </TabsContent>

          <TabsContent value="questions">
            <IntelligenceCustomQuestions />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
