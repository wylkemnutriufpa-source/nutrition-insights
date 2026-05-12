import { Badge } from "@v1/components/ui/badge";
import { Sparkles, Clock, Lock } from "lucide-react";
import type { AIUsageStatus } from "@v1/hooks/useAIUsage";

interface Props {
  status: AIUsageStatus & { usageLabel: string; nextAvailableLabel: string | null };
}

export default function AIUsageBadge({ status }: Props) {
  if (status.loading) return null;

  if (!status.allowed) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Badge variant="destructive" className="gap-1.5 text-xs">
          <Lock className="w-3 h-3" />
          Limite atingido ({status.usageLabel})
        </Badge>
        {status.nextAvailableLabel && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {status.nextAvailableLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1.5 text-xs">
      <Sparkles className="w-3 h-3" />
      {status.usageLabel}
    </Badge>
  );
}
