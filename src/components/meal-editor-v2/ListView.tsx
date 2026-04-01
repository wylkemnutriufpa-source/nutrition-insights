import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useMealPlanEditorV2Store } from "@/stores/mealPlanEditorV2Store";
import { DayTabs } from "./DayTabs";
import { DayContent } from "./DayContent";

export function ListView() {
  const { items } = useMealPlanEditorV2Store();
  const [selectedDay, setSelectedDay] = useState(1); // Monday default

  const getDayCount = useCallback(
    (day: number) => items.filter((i) => i.day_of_week === day).length,
    [items]
  );

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      <DayTabs selectedDay={selectedDay} onSelectDay={setSelectedDay} getDayCount={getDayCount} />
      <AnimatePresence mode="wait">
        <DayContent key={selectedDay} day={selectedDay} />
      </AnimatePresence>
    </div>
  );
}
