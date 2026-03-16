import { useNavigate } from "react-router-dom";
import { Zap, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface EditorVersionPickerProps {
  planId: string;
  /** Callback fired before navigating (e.g. close a dialog) */
  onBeforeNavigate?: () => void;
  /** Label shown on the trigger button */
  label?: string;
  /** Button variant */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Extra className for trigger */
  className?: string;
  /** Icon before label */
  icon?: React.ReactNode;
}

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

  const open = (version: "v1" | "v2") => {
    onBeforeNavigate?.();
    if (version === "v2") {
      navigate(`/meal-plans/${planId}`);
    } else {
      navigate(`/meal-plans/${planId}/legacy`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {icon}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => open("v2")} className="gap-2 cursor-pointer">
          <Zap className="w-4 h-4 text-primary" />
          <div>
            <p className="font-semibold text-sm">Editor Premium V2</p>
            <p className="text-[11px] text-muted-foreground">Local-first, rápido e fluido</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => open("v1")} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="font-semibold text-sm">Editor Clássico V1</p>
            <p className="text-[11px] text-muted-foreground">Editor original completo</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
