import React, { useEffect } from 'react';
import { MealPlanEditorV3 } from '@/components/meal-editor-v3/MealPlanEditorV3';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserX } from 'lucide-react';

const EditorV3Page = () => {
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();
  const { setPatientId } = useMealEditorV3Store();
  const navigate = useNavigate();
  const planId = searchParams.get('planId');

  useEffect(() => {
    if (patientId) {
      setPatientId(patientId);
    }
  }, [patientId, setPatientId]);

  // Fallback visual se patientId ou planId não existirem
  if (!patientId && !planId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
          <UserX className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Paciente não selecionado</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Para utilizar o Editor V3, você precisa selecionar um paciente ou carregar um plano existente.
        </p>
        <Button onClick={() => navigate('/patients')} variant="default" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Pacientes
        </Button>
      </div>
    );
  }

  return <MealPlanEditorV3 />;
};

export default EditorV3Page;
