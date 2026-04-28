import React from 'react';
import { MealPlanEditorV3 } from '@/components/meal-editor-v3/MealPlanEditorV3';
import { useParams } from 'react-router-dom';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';
import { useEffect } from 'react';

const MealPlanEditorV3Page = () => {
  const { patientId } = useParams();
  const { setPatientId } = useMealEditorV3Store();

  useEffect(() => {
    if (patientId) {
      setPatientId(patientId);
    }
  }, [patientId, setPatientId]);

  return <MealPlanEditorV3 />;
};

export default MealPlanEditorV3Page;
