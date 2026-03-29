import { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { autoFixMealPlan, type AutoFixResult } from "@/lib/autoFixEngine";
import AutoFixPreviewModal from "./AutoFixPreviewModal";

interface Props {
  mealPlanId: string;
  patientId: string;
  onFixed?: (newPlanId: string) => void;
}

export default function AutoFixButton({ mealPlanId, patientId, onFixed }: Props) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AutoFixResult | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleAutoFix = async () => {
    if (!user || !tenantId) return;
    setLoading(true);
    try {
      const res = await autoFixMealPlan(mealPlanId, patientId, user.id, tenantId);
      setResult(res);
      if (res.success) {
        setShowModal(true);
        toast.success(`Plano corrigido! ${res.changes.length} correções aplicadas.`);
      } else {
        toast.error(res.warnings[0] || "Erro ao corrigir plano");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro inesperado");
    }
    setLoading(false);
  };

  return (
    <>
      <Button
        onClick={handleAutoFix}
        disabled={loading}
        className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Corrigindo...</>
        ) : (
          <><Wand2 className="w-4 h-4" /> Corrigir automaticamente</>
        )}
      </Button>

      {result && (
        <AutoFixPreviewModal
          open={showModal}
          onOpenChange={setShowModal}
          result={result}
          onApprove={() => {
            setShowModal(false);
            if (result.newPlanId) onFixed?.(result.newPlanId);
          }}
        />
      )}
    </>
  );
}
