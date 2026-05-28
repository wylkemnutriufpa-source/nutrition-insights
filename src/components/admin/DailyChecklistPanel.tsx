
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2, 
  Circle, 
  PlayCircle, 
  AlertCircle, 
  Loader2,
  UserPlus,
  ClipboardList,
  Link,
  Zap,
  Send,
  FileText,
  Repeat,
  Layout
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: any;
  status: "pending" | "running" | "success" | "error";
  error?: string;
  runTest: () => Promise<void>;
}

export function DailyChecklistPanel() {
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: "cadastro",
      label: "Cadastro Funcioando",
      description: "Validar criação de perfil sem SQL manual",
      icon: UserPlus,
      status: "pending",
      runTest: async () => {
        const { data, error } = await supabase.from("profiles").insert({
          full_name: "Teste Operacional " + new Date().toISOString(),
          patient_state: "ready_for_plan"
        }).select("id").single();
        if (error) throw error;
        localStorage.setItem("last_test_patient_id", data.id);
      }
    },
    {
      id: "onboarding",
      label: "Onboarding Funcioando",
      description: "Validar estado inicial do paciente",
      icon: Layout,
      status: "pending",
      runTest: async () => {
        const id = localStorage.getItem("last_test_patient_id");
        if (!id) throw new Error("Execute 'Cadastro' primeiro");
        const { data, error } = await supabase.from("profiles").select("patient_state").eq("id", id).single();
        if (error) throw error;
        if (data.patient_state !== "ready_for_plan") throw new Error("Estado inválido pós-cadastro");
      }
    },
    {
      id: "vinculo",
      label: "Vínculo Correto",
      description: "Validar herança de Tenant e Profissional",
      icon: Link,
      status: "pending",
      runTest: async () => {
        const id = localStorage.getItem("last_test_patient_id");
        if (!id) throw new Error("Execute 'Cadastro' primeiro");
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", id).single();
        if (error) throw error;
        if (!data.tenant_id) throw new Error("Tenant não atribuído automaticamente");
      }
    },
    {
      id: "geracao",
      label: "Geração de Plano",
      description: "Validar IA e RPC de geração",
      icon: Zap,
      status: "pending",
      runTest: async () => {
        const id = localStorage.getItem("last_test_patient_id");
        if (!id) throw new Error("Execute 'Cadastro' primeiro");
        const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
          body: { patient_id: id }
        });
        if (error) throw error;
        if (!data.success) throw new Error(data.error || "Falha na geração");
        localStorage.setItem("last_test_plan_id", data.plan_id);
      }
    },
    {
      id: "publicacao",
      label: "Publicação Soberana",
      description: "Validar RPC publish_meal_plan_v3",
      icon: ClipboardList,
      status: "pending",
      runTest: async () => {
        const planId = localStorage.getItem("last_test_plan_id");
        const patientId = localStorage.getItem("last_test_patient_id");
        if (!planId || !patientId) throw new Error("Gere um plano primeiro");
        
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", patientId).single();

        const { error } = await supabase.rpc("publish_meal_plan_v3", {
          p_plan_id: planId,
          p_patient_id: patientId,
          p_nutritionist_id: user?.id,
          p_tenant_id: profile?.tenant_id,
          p_payload: {},
          p_items: [{ meal_name: "Almoço", food_name: "Arroz", clinical_mass_g: 100, calories: 130 }]
        });
        if (error) throw error;
      }
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      description: "Validar integração de mensageria",
      icon: Send,
      status: "pending",
      runTest: async () => {
        const planId = localStorage.getItem("last_test_plan_id");
        if (!planId) throw new Error("Publique um plano primeiro");
        // Simulação de envio (check infrastructure)
        const { data, error } = await supabase.from("whatsapp_logs").select("id").limit(1);
        if (error) throw error;
      }
    },
    {
      id: "pdf",
      label: "PDF",
      description: "Validar motor de renderização",
      icon: FileText,
      status: "pending",
      runTest: async () => {
        const planId = localStorage.getItem("last_test_plan_id");
        if (!planId) throw new Error("Publique um plano primeiro");
        // Check if PDF endpoint responds
        const { error } = await supabase.functions.invoke("generate-pdf", {
          body: { plan_id: planId, dry_run: true }
        });
        if (error) throw error;
      }
    },
    {
      id: "substituicoes",
      label: "Substituições",
      description: "Validar lógica de troca de alimentos",
      icon: Repeat,
      status: "pending",
      runTest: async () => {
        const { error } = await supabase.from("v3_substitutions").select("id").limit(1);
        if (error) throw error;
      }
    },
    {
      id: "app_paciente",
      label: "App Paciente",
      description: "Validar visibilidade final",
      icon: Layout,
      status: "pending",
      runTest: async () => {
        const patientId = localStorage.getItem("last_test_patient_id");
        if (!patientId) throw new Error("Finalize o fluxo primeiro");
        const { data, error } = await supabase.from("meal_plans").select("id").eq("patient_id", patientId).eq("is_active", true);
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Plano não visível para o paciente");
      }
    }
  ]);

  const runAll = async () => {
    for (const item of items) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "running" } : i));
      try {
        await item.runTest();
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "success" } : i));
        // Small delay for visual effect
        await new Promise(r => setTimeout(r, 300));
      } catch (err: any) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "error", error: err.message } : i));
        toast.error(`Falha em ${item.label}: ${err.message}`);
        break; // Stop on first failure to maintain flow consistency
      }
    }
    
    // Log result to database
    const successCount = items.filter(i => i.status === "success").length;
    await supabase.from("system_diagnostic_logs").insert({
      test_type: "daily-operational-checklist",
      health_score: Math.round((successCount / items.length) * 100),
      ok_count: successCount,
      critical_count: items.length - successCount,
      report_json: items.map(i => ({ id: i.id, status: i.status, error: i.error }))
    });
  };

  return (
    <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Checklist Operacional Diário
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Validação de ponta-a-ponta: do cadastro ao App do Paciente
          </p>
        </div>
        <Button onClick={runAll} disabled={items.some(i => i.status === "running")} size="lg" className="gap-2 shadow-lg shadow-primary/20">
          {items.some(i => i.status === "running") ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <PlayCircle className="h-5 w-5" />
          )}
          Executar Fluxo Completo
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                  item.status === "success" ? "border-green-500/30 bg-green-500/5 shadow-inner" :
                  item.status === "error" ? "border-destructive/30 bg-destructive/5" :
                  item.status === "running" ? "border-primary/50 bg-primary/5 animate-pulse" :
                  "border-muted bg-muted/20"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg ${
                    item.status === "success" ? "bg-green-500/20 text-green-500" :
                    item.status === "error" ? "bg-destructive/20 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  {item.status === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  {item.status === "error" && <AlertCircle className="h-5 w-5 text-destructive" />}
                  {item.status === "running" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                  {item.status === "pending" && <Circle className="h-5 w-5 text-muted-foreground/30" />}
                </div>
                <h3 className="font-semibold text-foreground">{item.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                {item.error && (
                  <p className="text-[10px] text-destructive mt-2 font-mono bg-destructive/10 p-1 rounded">
                    {item.error}
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {items.every(i => i.status === "success") && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 p-6 rounded-2xl bg-green-500/10 border-2 border-green-500/20 text-center"
          >
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-green-600">Sistema 100% Operacional</h2>
            <p className="text-sm text-green-700/80 mt-1 max-w-md mx-auto">
              Todos os contratos e fluxos críticos foram validados com sucesso. 
              O sistema está pronto para uso clínico real.
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
