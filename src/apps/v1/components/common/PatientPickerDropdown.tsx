import { useState, useRef, useEffect } from "react";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { Input } from "@v1/components/ui/input";
import { ScrollArea } from "@v1/components/ui/scroll-area";

interface PatientOption {
  id: string;
  name: string;
  email?: string;
}

interface PatientPickerDropdownProps {
  patients: PatientOption[];
  onSelect: (patientId: string) => void;
  loading?: string | null; // ID of patient being processed
  placeholder?: string;
}

export default function PatientPickerDropdown({
  patients,
  onSelect,
  loading,
  placeholder = "Buscar paciente para adicionar...",
}: PatientPickerDropdownProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = patients.filter(
    (p) => !search || 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg">
          <ScrollArea className="max-h-52">
            <div className="p-1">
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Nenhum paciente encontrado
                </p>
              ) : (
                filtered.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => {
                      onSelect(patient.id);
                      setSearch("");
                      setOpen(false);
                    }}
                    disabled={loading === patient.id}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-primary/10 transition-all text-sm group"
                  >
                    {loading === patient.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{patient.name}</span>
                      {patient.email && <span className="text-xs text-muted-foreground truncate block">{patient.email}</span>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
