import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Zap, Sparkles, Pencil } from "lucide-react";

interface EditorVersionPickerProps {
  planId: string;
  patientId?: string;
  onBeforeNavigate?: () => void;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  icon?: React.ReactNode;
}

/**
 * Picker that allows choosing between Editor V2 (Classic) and V3 (Elite).
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

  const handleNavigate = (version: "v2" | "v3") => {
    onBeforeNavigate?.();
    if (version === "v2") {
      navigate(`/meal-plans/${planId}`);
    } else {
      // For V3, we often need the patientId. We'll try to find it or just navigate to the general route if needed.
      // But usually, in the contexts where this is used, we have access to the plan.
      // For now, let's just point to /meal-plan-editor-v3 with a planId query param if possible, 
      // or assume the V3 page can handle finding the patient from the planId.
      navigate(`/meal-plan-editor-v3?planId=${planId}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {icon || <Pencil className="w-3.5 h-3.5 mr-1.5" />}
          {label}
          <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleNavigate("v2")} className="gap-2 cursor-pointer">
          <Zap className="w-4 h-4 text-amber-500" />
          <div className="flex flex-col">
            <span className="font-medium text-xs">Editor Clássico V2</span>
            <span className="text-[10px] text-muted-foreground">Rápido e direto</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigate("v3")} className="gap-2 cursor-pointer">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <div className="flex flex-col">
            <span className="font-medium text-xs">Editor Elite V3</span>
            <span className="text-[10px] text-muted-foreground">Semanal e avançado</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
