/**
 * Intelligence Settings Panel — Premium golden configuration hub
 * for nutritionists to fully customize the FitJourney Intelligence engine.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, MessageSquare, HelpCircle, Settings2, Users, Play, Bot, BarChart3, FileText, Command } from "lucide-react";
import IntelligenceGoldenHeader from "./settings/IntelligenceGoldenHeader";
import IntelligenceGeneralSettings from "./settings/IntelligenceGeneralSettings";
import IntelligenceCustomPrompts from "./settings/IntelligenceCustomPrompts";
import IntelligenceCustomQuestions from "./settings/IntelligenceCustomQuestions";
import IntelligenceActiveUsers from "./settings/IntelligenceActiveUsers";
import IntelligenceParticles from "./settings/IntelligenceParticles";
import IntelligenceActivationPreview from "./settings/IntelligenceActivationPreview";
import IFJConversationalCopilot from "./modules/IFJConversationalCopilot";
import IFJPredictiveBriefing from "./modules/IFJPredictiveBriefing";
import IFJNarrativeReport from "./modules/IFJNarrativeReport";
import IFJCommandCenter from "./modules/IFJCommandCenter";

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
          <TabsList className="bg-background/80 backdrop-blur-sm border border-amber-500/20 p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600">
              <Settings2 className="w-4 h-4" /> Configurações
            </TabsTrigger>
            <TabsTrigger value="copilot" className="gap-2 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600">
              <Bot className="w-4 h-4" /> Copiloto
            </TabsTrigger>
            <TabsTrigger value="predictions" className="gap-2 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600">
              <BarChart3 className="w-4 h-4" /> Preditivo
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600">
              <FileText className="w-4 h-4" /> Relatórios
            </TabsTrigger>
            <TabsTrigger value="prompts" className="gap-2 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600">
              <MessageSquare className="w-4 h-4" /> Mensagens
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-2 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600">
              <HelpCircle className="w-4 h-4" /> Perguntas
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600">
              <Users className="w-4 h-4" /> Ativos
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600">
              <Play className="w-4 h-4" /> Apresentação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <IntelligenceGeneralSettings />
          </TabsContent>

          <TabsContent value="copilot">
            <IFJConversationalCopilot />
          </TabsContent>

          <TabsContent value="predictions">
            <IFJPredictiveBriefing />
          </TabsContent>

          <TabsContent value="reports">
            <IFJNarrativeReport />
          </TabsContent>

          <TabsContent value="prompts">
            <IntelligenceCustomPrompts />
          </TabsContent>

          <TabsContent value="questions">
            <IntelligenceCustomQuestions />
          </TabsContent>

          <TabsContent value="active">
            <IntelligenceActiveUsers />
          </TabsContent>

          <TabsContent value="preview">
            <IntelligenceActivationPreview />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
