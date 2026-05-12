import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { toast } from "sonner";

export function useProfessionalLinks(professionalRole = "trainer") {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const linksQuery = useQuery({
    queryKey: ["professional-links", user?.id, professionalRole],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("patient_professional_links")
        .select("*")
        .eq("professional_id", user.id)
        .eq("professional_role", professionalRole)
        .eq("link_status", "active");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const revokeLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from("patient_professional_links")
        .update({ link_status: "revoked", updated_at: new Date().toISOString() })
        .eq("id", linkId);
      if (error) throw error;

      // Also sync personal_trainer_students
      if (professionalRole === "trainer") {
        const link = linksQuery.data?.find((l) => l.id === linkId);
        if (link) {
          await supabase
            .from("personal_trainer_students")
            .update({ status: "inactive" })
            .eq("personal_id", user!.id)
            .eq("student_id", link.patient_id);
        }
      }
    },
    onSuccess: () => {
      toast.success("Vínculo removido");
      queryClient.invalidateQueries({ queryKey: ["professional-links"] });
    },
    onError: () => toast.error("Erro ao remover vínculo"),
  });

  return { links: linksQuery.data || [], loading: linksQuery.isLoading, refetch: linksQuery.refetch, revokeLink };
}
