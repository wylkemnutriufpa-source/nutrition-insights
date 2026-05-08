import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useNutritionistProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('nc_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: newProfile } = await supabase
          .from('nc_profiles')
          .insert([{ user_id: user.id, full_name: user.email?.split('@')[0], role: 'nutritionist' }])
          .select()
          .single();
        setProfile(newProfile);
      } else {
        setProfile(data);
      }
      setLoading(false);
    }

    fetchProfile();
  }, []);

  return { profile, loading };
}
