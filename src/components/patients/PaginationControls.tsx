import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { PaginationState } from "@/hooks/queries/usePatientsList";

interface PaginationControlsProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250];

export default function PaginationControls({ pagination, onPageChange, onPageSizeChange, isLoading }: PaginationControlsProps) {
  const { page, pageSize, totalCount, totalPages, hasNextPage, hasPreviousPage } = pagination;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  if (totalCount === 0) return null;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 py-3">
      {/* Info */}
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{from}–{to}</span> de{" "}
        <span className="font-medium text-foreground">{totalCount}</span> pacientes
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Page size selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground hidden sm:inline">Por página:</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-[70px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(size => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page info */}
        <span className="text-xs text-muted-foreground min-w-[80px] text-center">
          Página {page} de {totalPages}
        </span>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="icon"
            className="h-8 w-8"
            disabled={!hasPreviousPage || isLoading}
            onClick={() => onPageChange(1)}
            title="Primeira página"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline" size="icon"
            className="h-8 w-8"
            disabled={!hasPreviousPage || isLoading}
            onClick={() => onPageChange(page - 1)}
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline" size="icon"
            className="h-8 w-8"
            disabled={!hasNextPage || isLoading}
            onClick={() => onPageChange(page + 1)}
            title="Próxima página"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline" size="icon"
            className="h-8 w-8"
            disabled={!hasNextPage || isLoading}
            onClick={() => onPageChange(totalPages)}
            title="Última página"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}