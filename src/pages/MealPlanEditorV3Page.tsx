import React, { useEffect } from 'react';
import { MealPlanEditorV3 } from '@/components/meal-editor-v3/MealPlanEditorV3';
import { useParams, useSearchParams } from 'react-router-dom';
import { useMealEditorV3Store } from '@/hooks/meal-editor-v3/useMealEditorV3Store';

const MealPlanEditorV3Page = () => {
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();
  const { setPatientId } = useMealEditorV3Store();
  const planId = searchParams.get('planId');

  useEffect(() => {
    if (patientId) {
      setPatientId(patientId);
    }
  }, [patientId, setPatientId]);

  // If we have a planId, we could potentially load it here 
  // currently the store handles loading via patientId + local persistence
  // but capturing it here ensures the page is aware of the context.

  return <MealPlanEditorV3 />;
};

export default MealPlanEditorV3Page;
