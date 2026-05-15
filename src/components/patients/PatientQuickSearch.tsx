import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search, User, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface PatientResult {
  user_id: string;
  full_name: string;
  email?: string;
  avatar_url?: string | null;
}

interface Props {
  onSelect?: (patient: PatientResult) => void;
  className?: string;
  showIconOnly?: boolean;
  collapsed?: boolean;
}

export default function PatientQuickSearch({ onSelect, className, showIconOnly = false, collapsed = false }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<PatientResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, isNutritionist, isAdmin, isPersonal } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isPro = isNutritionist || isAdmin || isPersonal;

  // Search patients in real-time
  useEffect(() => {
    if (!open || !isPro) return;

    const fetchPatients = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url");

        if (search.trim()) {
          query = query.ilike("full_name", `%${search}%`);
        }

        if (!isAdmin) {
          // If not admin, only search within nutritionist's linked patients
          const { data: links } = await supabase
            .from("nutritionist_patients")
            .select("patient_id")
            .eq("nutritionist_id", user?.id || "")
            .eq("status", "active");

          if (links && links.length > 0) {
            query = query.in("user_id", links.map(l => l.patient_id));
          } else if (!search.trim()) {
            // No links and no search = empty
            setPatients([]);
            setLoading(false);
            return;
          }
        }

        const { data, error } = await query
          .order("full_name")
          .limit(20);

        if (error) throw error;
        
        if (data) {
          setPatients(data.map(p => ({
            user_id: p.user_id,
            full_name: p.full_name || "Sem nome",
            avatar_url: p.avatar_url
          })));
        }
      } catch (err) {
        console.error("Error fetching patients for autocomplete:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchPatients, search ? 150 : 0); // Reduzido para 150ms para sensação de tempo real
    return () => clearTimeout(timer);
  }, [open, search, isPro, isAdmin, user?.id]);

  const normalize = (text: string) => 
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filteredPatients = patients; // Already filtered by backend or initial load

  const handleSelect = useCallback((patient: PatientResult) => {
    setOpen(false);
    if (onSelect) {
      onSelect(patient);
    } else {
      // Default behavior: go to patient profile
      navigate(`/patient-overview?id=${patient.user_id}`);
    }
  }, [onSelect, navigate]);

  if (!isPro) return null;

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={(val) => {
        setOpen(val);
        if (val) {
          // Reset search when opening to allow fresh start
          setSearch("");
        }
      }}>
        <PopoverTrigger asChild>
          <div className="w-full">
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-start text-muted-foreground font-bold uppercase tracking-widest transition-all border-white/5 hover:border-emerald-500/50 bg-white/5 rounded-2xl shadow-inner",
                showIconOnly ? "w-11 h-11 px-0 justify-center" : "h-11 px-4"
              )}
            >
              <Search className={cn("h-4 w-4 shrink-0 text-emerald-500", showIconOnly ? "" : "mr-3")} />
              {!showIconOnly && <span className="truncate text-[10px]">{search || "Buscar paciente..."}</span>}
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0 border-white/10 bg-neutral-950 backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden z-[100]" align="start" sideOffset={8}>
          <Command shouldFilter={false} className="bg-transparent">
            <div className="flex items-center border-b border-white/5 px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput 
                placeholder="Digite o nome do paciente..." 
                value={search}
                onValueChange={setSearch}
                className="h-12 border-none focus:ring-0 bg-transparent text-white uppercase text-[10px] font-black tracking-widest flex-1"
                autoFocus
              />
            </div>
            <CommandList className="max-h-[350px] scrollbar-thin">
              {loading && patients.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                </div>
              ) : (
                <>
                  <CommandEmpty className="py-10 text-center text-[10px] font-black uppercase tracking-widest text-white/20">
                    Nenhum paciente encontrado.
                  </CommandEmpty>
                  <CommandGroup heading={<span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/40 px-2">Resultados</span>}>
                    {filteredPatients.map((patient) => (
                      <CommandItem
                        key={patient.user_id}
                        value={patient.user_id}
                        onSelect={() => handleSelect(patient)}
                        className="flex items-center gap-4 px-4 py-3 cursor-pointer rounded-xl hover:bg-emerald-500/10 aria-selected:bg-emerald-500/5 transition-all group/item"
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0 group-hover/item:scale-110 transition-transform">
                          {patient.avatar_url ? (
                            <img src={patient.avatar_url} alt={patient.full_name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-emerald-500" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black uppercase italic text-white group-hover:text-emerald-400 transition-colors">{patient.full_name}</span>
                          <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Paciente Ativo</span>
                        </div>
                        <Check className="ml-auto h-4 w-4 opacity-0 group-hover/item:opacity-100 transition-all text-emerald-500" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
