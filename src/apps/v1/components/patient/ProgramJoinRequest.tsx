import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@v1/components/ui/dialog";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Textarea } from "@v1/components/ui/textarea";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { toast } from "sonner";
import { Rocket, Send, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Program {
  id: string;
  title: string;
  tag: string;
}

interface ProgramJoinRequestProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PromoConfig {
  enabled: boolean;
  date: string;
  price: string;
  programId: string; // "" or "all" = all programs, otherwise specific program ID
}

export default function ProgramJoinRequest({ open, onOpenChange }: ProgramJoinRequestProps) {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [promo, setPromo] = useState<PromoConfig>({ enabled: false, date: "", price: "", programId: "" });

  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    loadPrograms();
    loadPromoConfig();
  }, [open, user]);

  async function loadPromoConfig() {
    const { data } = await (supabase as any)
      .from("site_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["promo_alert_enabled", "promo_alert_date", "promo_alert_price", "promo_alert_program_id"]);
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((r: any) => { map[r.setting_key] = typeof r.setting_value === "string" ? r.setting_value : String(r.setting_value); });
      setPromo({
        enabled: map["promo_alert_enabled"] === "true",
        date: map["promo_alert_date"] || "",
        price: map["promo_alert_price"] || "300",
        programId: map["promo_alert_program_id"] || "",
      });
    }
  }

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
      const selectedProgram = programs.find(p => p.id === selected);
      const { data: programData } = await supabase.from("programs").select("created_by").eq("id", selected).maybeSingle();
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
      
      if (programData?.created_by) {
        await supabase.from("notifications").insert({
          user_id: programData.created_by,
          title: "Nova solicitação de programa",
          message: `${profile?.full_name || "Um paciente"} solicitou participar do programa "${selectedProgram?.title || ""}".`,
          type: "program_join_request",
          action_url: `/programs/${selected}`,
        } as any);
      }

      toast.success("🚀 Solicitação enviada! Aguarde a aprovação.");
      setSelected(null);
      setMessage("");
      onOpenChange(false);
    }
    setSending(false);
  };

  const formattedPromoDate = promo.date
    ? (() => {
        try {
          return format(new Date(promo.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });
        } catch {
          return promo.date;
        }
      })()
    : "";

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
            {/* Promo Alert */}
            <AnimatePresence>
              {promo.enabled && selected && (promo.programId === "" || promo.programId === "all" || promo.programId === selected) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-yellow-400/15 to-amber-500/10 p-4 mb-2 overflow-hidden">
                    <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20 blur-md opacity-50 animate-pulse pointer-events-none" />
                    <div className="relative flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-600/20 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
                          🔥 Oferta Promocional
                        </p>
                        <p className="text-sm text-foreground/90 mt-1 leading-relaxed">
                          Aproveite a inscrição no <span className="font-bold text-amber-400">valor promocional</span> até{" "}
                          <span className="font-bold text-amber-300">{formattedPromoDate}</span>.
                          Após essa data, o valor será{" "}
                          <span className="font-bold text-amber-300">R$ {promo.price}</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
