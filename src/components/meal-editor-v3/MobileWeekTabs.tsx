import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const WEEKDAYS = [
  { id: 'sun', short: 'Dom' },
  { id: 'mon', short: 'Seg' },
  { id: 'tue', short: 'Ter' },
  { id: 'wed', short: 'Qua' },
  { id: 'thu', short: 'Qui' },
  { id: 'fri', short: 'Sex' },
  { id: 'sat', short: 'Sáb' },
];

interface Props {
  activeDay: string;
  onChange: (id: string) => void;
}

/**
 * Tabs horizontais com dias da semana (Dom...Sáb).
 * Modo Semana = NÃO gera novos planos, apenas expande substituições do plano vigente.
 */
export const MobileWeekTabs: React.FC<Props> = ({ activeDay, onChange }) => {
  // Calcula datas a partir do domingo da semana atual
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-1 pb-1 -mx-1">
      {WEEKDAYS.map((d, idx) => {
        const date = new Date(sunday);
        date.setDate(sunday.getDate() + idx);
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const isActive = d.id === activeDay;
        return (
          <button
            key={d.id}
            onClick={() => onChange(d.id)}
            className={cn(
              'relative flex flex-col items-center justify-center min-w-[48px] py-2 px-2 rounded-xl transition-colors flex-shrink-0',
              isActive
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="day-pill"
                className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/25"
                transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }}
              />
            )}
            <span className="relative z-10 text-[11px] font-bold leading-none">{d.short}</span>
            <span className="relative z-10 text-[10px] font-semibold opacity-80 mt-0.5">{dd}/{mm}</span>
          </button>
        );
      })}
    </div>
  );
};
