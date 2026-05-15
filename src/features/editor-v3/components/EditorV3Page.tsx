import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function EditorV3Page() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Editor V3 (Modo Minimalista)</h1>
        <p className="mt-4">O sistema agora opera exclusivamente com edição manual e biblioteca de templates.</p>
      </div>
    </DashboardLayout>
  );
}