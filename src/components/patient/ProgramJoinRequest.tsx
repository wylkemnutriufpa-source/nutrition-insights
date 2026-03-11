import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Rocket, Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Program {
  id: string;
  title: string;
  tag: string;
}

interface ProgramJoinRequestProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProgramJoinRequest({ open, onOpenChange }: ProgramJoinRequestProps) {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    loadPrograms();
  }, [open, user]);

  async function loadPrograms() {
    setLoading(true);
    const [enrolledRes, pendingRes, allRes] = await Promise.all([
      supabase.from("program_patients").select("program_id").eq("patient_id", user!.id).eq("status", "active"),
      supabase.from("program_join_requests").select("program_id").eq("patient_id", user!.id).eq("status", "pending"),
      supabase.from("programs").select("id, title, tag").eq("is_active", true),
    ]);

    const enrolled = enrolledRes.data?.map((e: any) => e.program_id) || [];
    const pending = pendingRes.data?.map((e: any) => e.program_id) || [];
    setEnrolledIds(enrolled);
    setPendingIds(pending);
    setPrograms((allRes.data || []) as Program[]);
    setLoading(false);
  }

  const handleSend = async () => {
    if (!user || !selected) return;
    setSending(true);

    const { error } = await supabase.from("program_join_requests").insert({
      patient_id: user.id,
      program_id: selected,
      message: message.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast.info("Você já solicitou participar deste programa.");
      } else {
        toast.error("Erro ao enviar solicitação");
      }
    } else {
      toast.success("🚀 Solicitação enviada! Aguarde a aprovação.");
      setSelected(null);
      setMessage("");
      onOpenChange(false);
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Participar de um Programa
          </DialogTitle>
          <DialogDescription>
            Selecione o programa que deseja participar. Seu nutricionista precisará aprovar.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : programs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum programa disponível no momento.
          </p>
        ) : (
          <>
            <ScrollArea className="max-h-[40vh]">
              <div className="space-y-2">
                {programs.map((program) => {
                  const isEnrolled = enrolledIds.includes(program.id);
                  const isPending = pendingIds.includes(program.id);
                  const disabled = isEnrolled || isPending;

                  return (
                    <button
                      key={program.id}
                      onClick={() => !disabled && setSelected(program.id)}
                      disabled={disabled}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        disabled
                          ? "border-border/30 bg-muted/10 opacity-60 cursor-not-allowed"
                          : selected === program.id
                            ? "border-primary bg-primary/10"
                            : "border-border/50 bg-muted/20 hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{program.title}</p>
                          {program.tag && <p className="text-xs text-muted-foreground">{program.tag}</p>}
                        </div>
                        {isEnrolled && (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] shrink-0">✅ Já participa</Badge>
                        )}
                        {isPending && (
                          <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px] shrink-0">⏳ Aguardando</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            <Textarea
              placeholder="Mensagem opcional..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={300}
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSend} disabled={sending || !selected} className="gap-2">
                <Send className="w-4 h-4" />
                {sending ? "Enviando..." : "Solicitar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
