import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { sendWhatsAppNotification } from "@/utils/whatsappNotification";
import { toast } from "sonner";

interface WhatsAppNotifyButtonProps {
  patientId: string;
  message: string;
  label?: string;
  variant?: "outline" | "ghost" | "default" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export const WhatsAppNotifyButton = ({ 
  patientId, 
  message, 
  label = "Notificar WhatsApp", 
  variant = "outline", 
  size = "sm",
  className 
}: WhatsAppNotifyButtonProps) => {
  const handleNotify = async () => {
    try {
      await sendWhatsAppNotification({ patientId, message });
    } catch (err) {
      toast.error("Erro ao abrir WhatsApp");
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      className={className}
      onClick={handleNotify}
    >
      <MessageSquare className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
};
