import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SOSTicket {
  id: string;
  patient_id: string;
  category: string;
  description: string | null;
  status: string;
  created_at: string;
  patient_name?: string;
}

interface SOSInboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  plan_doubt: "Dúvidas no plano",
  protocol_doubt: "Dúvidas no protocolo",
  supplement_doubt: "Suplementação",
  side_effects: "Efeitos colaterais",
  other: "Outra dúvida",
};

export default function SOSInbox({ open, onOpenChange }: SOSInboxProps) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SOSTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !user) return;
    loadTickets();
  }, [open, user]);

  async function loadTickets() {
    setLoading(true);
    const { data } = await supabase
      .from("sos_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      // Enrich with patient names
      const patientIds = [...new Set(data.map((t: any) => t.patient_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", patientIds);
      
      const nameMap = new Map(profiles?.map((p: any) => [p.user_id, p.full_name]) || []);
      
      setTickets(data.map((t: any) => ({
        ...t,
        patient_name: nameMap.get(t.patient_id) || "Paciente",
      })));
    }
    setLoading(false);
  }

  async function resolveTicket(ticketId: string) {
    const { error } = await supabase
      .from("sos_tickets")
      .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user?.id })
      .eq("id", ticketId);

    if (error) {
      toast.error("Erro ao resolver ticket");
    } else {
      toast.success("✅ SOS resolvido!");
      setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: "resolved" } : t));
    }
  }

  const pendingCount = tickets.filter((t) => t.status === "pending").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            SOS - Pedidos de Ajuda
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingCount} pendente{pendingCount > 1 ? "s" : ""}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Pacientes que precisam de ajuda urgente.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum SOS recebido.</p>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`p-4 rounded-xl border transition-all ${
                    ticket.status === "pending"
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border/50 bg-muted/20 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{ticket.patient_name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ticket.category.split(",").map((cat) => (
                          <Badge key={cat} variant="outline" className="text-[10px]">
                            {CATEGORY_LABELS[cat] || cat}
                          </Badge>
                        ))}
                      </div>
                      {ticket.description && (
                        <p className="text-xs text-muted-foreground mt-2">{ticket.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(ticket.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    {ticket.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => resolveTicket(ticket.id)}
                        className="shrink-0 gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolvido
                      </Button>
                    )}
                    {ticket.status === "resolved" && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Resolvido
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
