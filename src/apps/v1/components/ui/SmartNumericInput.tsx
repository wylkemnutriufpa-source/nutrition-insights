import { useState, useEffect, useCallback } from "react";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { cn } from "@v1/lib/utils";
import { Check, AlertCircle, Info } from "lucide-react";
import type { NormalizationResult, FieldNormalizer } from "@v1/lib/normalizeInputs";

interface SmartNumericInputProps {
  label: string;
  placeholder?: string;
  normalizer: FieldNormalizer;
  value: string;
  onChange: (raw: string, normalized: NormalizationResult) => void;
  className?: string;
  disabled?: boolean;
  /** Show compact label style */
  compact?: boolean;
}

export default function SmartNumericInput({
  label,
  placeholder,
  normalizer,
  value,
  onChange,
  className,
  disabled,
  compact = false,
}: SmartNumericInputProps) {
  const [result, setResult] = useState<NormalizationResult | null>(null);

  const handleChange = useCallback(
    (raw: string) => {
      const r = normalizer(raw);
      setResult(r);
      onChange(raw, r);
    },
    [normalizer, onChange]
  );

  // Run normalizer on initial value
  useEffect(() => {
    if (value) {
      setResult(normalizer(value));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasValue = value.trim().length > 0;
  const isValid = result?.isValid ?? false;
  const isInvalid = hasValue && !isValid;
  const wasCorrected = result?.wasCorrected ?? false;

  return (
    <div className={cn("space-y-1", className)}>
      <Label className={compact ? "text-[11px] text-muted-foreground" : "text-xs"}>
        {label}
      </Label>
      <div className="relative">
        <Input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className={cn(
            compact ? "h-9 text-sm" : "",
            "pr-8",
            isValid && "border-green-500/50 focus-visible:ring-green-500/30",
            isInvalid && "border-destructive/50 focus-visible:ring-destructive/30"
          )}
        />
        {hasValue && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {isValid && !wasCorrected && (
              <Check className="w-4 h-4 text-green-500" />
            )}
            {isValid && wasCorrected && (
              <Info className="w-4 h-4 text-blue-500" />
            )}
            {isInvalid && (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
          </div>
        )}
      </div>
      {hasValue && result?.message && (
        <p
          className={cn(
            "text-[10px] leading-tight",
            isValid && wasCorrected && "text-blue-600 dark:text-blue-400",
            isValid && !wasCorrected && "text-green-600 dark:text-green-400",
            isInvalid && "text-destructive"
          )}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
