import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePatients(nutritionistId: string | undefined) {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!nutritionistId) return;

    async function fetchPatients() {
      const { data } = await supabase
        .from('nc_patients')
        .select('*')
        .eq('nutritionist_id', nutritionistId)
        .order('created_at', { ascending: false });

      setPatients(data || []);
      setLoading(false);
    }

    fetchPatients();
  }, [nutritionistId]);

  return { patients, loading };
}
