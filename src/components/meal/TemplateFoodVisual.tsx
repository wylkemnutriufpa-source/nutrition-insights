import { useMealVisualMatch } from "@/hooks/useMealVisualLibrary";

interface TemplateFoodVisualProps {
  foodName: string;
  className?: string;
}

export function TemplateFoodVisual({ foodName, className = "" }: TemplateFoodVisualProps) {
  const match = useMealVisualMatch(foodName);

  if (!match?.image_url) return null;

  return (
    <img
      src={match.image_url}
      alt={match.display_name || foodName}
      className={`w-8 h-8 rounded-md object-cover flex-shrink-0 ${className}`}
      loading="lazy"
    />
  );
}
