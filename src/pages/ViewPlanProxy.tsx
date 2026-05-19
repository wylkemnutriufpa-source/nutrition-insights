import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Proxy de Visualização de Planos
 * Este componente atua como um redirecionador amigável para links de planos alimentares
 * hospedados no storage do Supabase, mantendo a aparência de domínio próprio.
 */
const ViewPlanProxy = () => {
  const { userId, fileName } = useParams();

  useEffect(() => {
    if (userId && fileName) {
      // Reconstroi o link original do storage do Supabase
      const supabaseUrl = "https://vkrcobprntictsxqmjjl.supabase.co";
      const storageUrl = `${supabaseUrl}/storage/v1/object/public/shared-meal-plans/${userId}/${fileName}`;
      
      // Redireciona para o arquivo HTML real no storage
      window.location.replace(storageUrl);
    }
  }, [userId, fileName]);

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-black uppercase tracking-widest animate-pulse">
          Carregando seu plano FitJourney...
        </p>
      </div>
    </div>
  );
};

export default ViewPlanProxy;
