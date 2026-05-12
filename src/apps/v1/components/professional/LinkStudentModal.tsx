import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Input } from "@v1/components/ui/input";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Avatar, AvatarFallback } from "@v1/components/ui/avatar";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { toast } from "sonner";
import { Search, UserPlus, Loader2, CheckCircle2, Sparkles, Mail, Phone, FileText } from "lucide-react";

interface LinkStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinked: () => void;
  professionalRole?: string;
}

export default function LinkStudentModal({ open, onOpenChange, onLinked, professionalRole = "trainer" }: LinkStudentModalProps) {
  const { user } = useAuth();
  const [searchType, setSearchType] = useState<"email" | "phone" | "cpf">("email");
  const [searchValue, setSearchValue] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundPatient, setFoundPatient] = useState<any>(null);
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(false);

  const searchPatient = async () => {
    if (!searchValue.trim()) return;
    setSearching(true);
    setFoundPatient(null);

    try {
      if (searchType === "email") {
        const { data } = await supabase.rpc("find_patient_by_email", {
          _email: searchValue.trim().toLowerCase(),
        });
        if (data) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", data)
            .single();
          setFoundPatient({ id: data, ...profile });
        } else {
          toast.error("Paciente não encontrado com este email");
        }
      } else {
        // Search by phone
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .ilike("phone", `%${searchValue.trim()}%`)
          .limit(1);
        if (profiles && profiles.length > 0) {
          setFoundPatient({ id: profiles[0].user_id, ...profiles[0] });
        } else {
          toast.error("Paciente não encontrado");
        }
      }
    } catch {
      toast.error("Erro na busca");
    }
    setSearching(false);
  };

  const linkPatient = async () => {
    if (!foundPatient || !user) return;
    setLinking(true);

    try {
      // Check if already linked
      const { data: existing } = await supabase
        .from("patient_professional_links")
        .select("id, link_status")
        .eq("patient_id", foundPatient.id)
        .eq("professional_id", user.id)
        .eq("professional_role", professionalRole)
        .maybeSingle();

      if (existing) {
        if (existing.link_status === "active") {
          toast.error("Este paciente já está vinculado a você");
          setLinking(false);
          return;
        }
        // Reactivate
        await supabase
          .from("patient_professional_links")
          .update({ link_status: "active", updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        const { error } = await supabase.from("patient_professional_links").insert({
          patient_id: foundPatient.id,
          professional_id: user.id,
          professional_role: professionalRole,
          link_status: "active",
          created_by: user.id,
        });
        if (error) throw error;
      }

      // Also sync to personal_trainer_students for backward compat
      if (professionalRole === "trainer") {
        await supabase.from("personal_trainer_students").upsert({
          personal_id: user.id,
          student_id: foundPatient.id,
          status: "active",
        }, { onConflict: "personal_id,student_id" });
      }

      setLinked(true);
      toast.success("Paciente vinculado com sucesso!");
      setTimeout(() => {
        onLinked();
        setLinked(false);
        setFoundPatient(null);
        setSearchValue("");
        onOpenChange(false);
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Erro ao vincular");
    }
    setLinking(false);
  };

  const initials = (foundPatient?.full_name || "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Vincular Paciente Existente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Search Type Tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {[
              { key: "email" as const, icon: Mail, label: "Email" },
              { key: "phone" as const, icon: Phone, label: "Telefone" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => { setSearchType(t.key); setFoundPatient(null); setSearchValue(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                  searchType === t.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={searchType === "email" ? "email@paciente.com" : "(11) 99999-9999"}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchPatient()}
              className="pl-9"
            />
          </div>

          <Button onClick={searchPatient} disabled={searching || !searchValue.trim()} className="w-full gap-2">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar Paciente
          </Button>

          {/* Found Patient Card */}
          <AnimatePresence>
            {foundPatient && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 rounded-xl border border-primary/20 bg-primary/5"
              >
                {linked ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex flex-col items-center gap-3 py-4"
                  >
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 0.6 }}
                    >
                      <CheckCircle2 className="w-12 h-12 text-green-500" />
                    </motion.div>
                    <p className="font-semibold text-green-600">Vinculado com Sucesso!</p>
                    <p className="text-xs text-muted-foreground">Time de Performance formado 🏆</p>
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14 border-2 border-primary/30">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base">{foundPatient.full_name || "Paciente"}</p>
                      <p className="text-xs text-muted-foreground truncate">{foundPatient.phone || "Sem telefone"}</p>
                      <Badge variant="outline" className="mt-1 text-[10px]">Paciente encontrado</Badge>
                    </div>
                    <Button
                      onClick={linkPatient}
                      disabled={linking}
                      size="sm"
                      className="gap-1.5 bg-gradient-to-r from-primary to-primary/80"
                    >
                      {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Vincular
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
