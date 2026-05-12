import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { WhatsAppTemplateType } from "@/utils/invitation";

export function useWhatsAppTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("template_key, content")
        .eq("professional_id", user.id);

      if (error) throw error;

      const templateMap = (data || []).reduce((acc, curr) => {
        acc[curr.template_key] = curr.content;
        return acc;
      }, {} as Record<string, string>);

      setTemplates(templateMap);
    } catch (err) {
      console.error("Error fetching WhatsApp templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (key: WhatsAppTemplateType, content: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("whatsapp_templates")
        .upsert({
          professional_id: user.id,
          template_key: key,
          content,
          updated_at: new Date().toISOString()
        }, { onConflict: "professional_id,template_key" });

      if (error) throw error;
      setTemplates(prev => ({ ...prev, [key]: content }));
      toast.success("Template salvo com sucesso! ✅");
    } catch (err) {
      toast.error("Erro ao salvar template.");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [user?.id]);

  return { templates, loading, saveTemplate, refresh: fetchTemplates };
}

export function useWhatsAppLogs() {
  const { user } = useAuth();

  const logInvitation = async (params: {
    patientName?: string;
    patientPhone?: string;
    invitationType: WhatsAppTemplateType;
    metadata?: any;
  }) => {
    if (!user) return;
    try {
      await supabase.from("whatsapp_invitation_logs").insert({
        professional_id: user.id,
        patient_name: params.patientName,
        patient_phone: params.patientPhone,
        invitation_type: params.invitationType,
        metadata: params.metadata || {}
      });
    } catch (err) {
      console.error("Error logging WhatsApp invitation:", err);
    }
  };

  return { logInvitation };
}
