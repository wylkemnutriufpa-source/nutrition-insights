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
          .select("user_id, full_name, avatar_url, email");

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
            avatar_url: p.avatar_url,
            email: p.email
          })));
        }
      } catch (err) {
        console.error("Error fetching patients for autocomplete:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchPatients, search ? 300 : 0);
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-start text-muted-foreground font-normal transition-all border-border/40 hover:border-primary/50 bg-muted/20 rounded-xl",
              showIconOnly ? "w-9 h-9 px-0 justify-center" : "h-9 px-3"
            )}
          >
            <Search className={cn("h-4 w-4 shrink-0", showIconOnly ? "" : "mr-2")} />
            {!showIconOnly && <span className="truncate">Buscar paciente...</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden z-[100]" align="start" sideOffset={8}>
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Digite o nome..." 
              value={search}
              onValueChange={setSearch}
              className="h-11 border-none focus:ring-0"
            />
            <CommandList className="max-h-[300px] scrollbar-thin">
              {loading && patients.length === 0 ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
                    Nenhum paciente encontrado.
                  </CommandEmpty>
                  <CommandGroup heading="Pacientes">
                    {filteredPatients.map((patient) => (
                      <CommandItem
                        key={patient.user_id}
                        value={patient.user_id}
                        onSelect={() => handleSelect(patient)}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-primary/10 aria-selected:bg-primary/10"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                          {patient.avatar_url ? (
                            <img src={patient.avatar_url} alt={patient.full_name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold truncate">{patient.full_name}</span>
                          {patient.email && (
                            <span className="text-[10px] text-muted-foreground truncate">{patient.email}</span>
                          )}
                        </div>
                        <Check className="ml-auto h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
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
