import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface EditorVersionPickerProps {
  planId: string;
  onBeforeNavigate?: () => void;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  icon?: React.ReactNode;
}

/**
 * Simple button that navigates directly to the V2 editor.
 * Legacy picker dropdown was removed – V2 is now the only editor.
 */
export function EditorVersionPicker({
  planId,
  onBeforeNavigate,
  label = "Editar Plano",
  variant = "outline",
  size = "sm",
  className,
  icon,
}: EditorVersionPickerProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    onBeforeNavigate?.();
    navigate(`/meal-plans/${planId}`);
  };

  return (
    <Button variant={variant} size={size} className={className} onClick={handleClick}>
      {icon}
      {label}
    </Button>
  );
}
