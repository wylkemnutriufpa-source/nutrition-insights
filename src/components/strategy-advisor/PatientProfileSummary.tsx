import { Badge } from "@/components/ui/badge";
import { User, Activity, Scale, Flame } from "lucide-react";

interface ProfileData {
  summary: string;
  metabolicType: string;
  bmi: number;
  bmiCategory: string;
  tmb: number;
  tdee: number;
}

interface Props {
  profile: ProfileData;
}

export default function PatientProfileSummary({ profile }: Props) {
  const bmiColor = profile.bmi < 18.5 ? "text-blue-500" :
    profile.bmi < 25 ? "text-emerald-500" :
    profile.bmi < 30 ? "text-amber-500" : "text-red-500";

  return (
    <div className="bg-muted/30 rounded-xl p-3 space-y-2 border border-border/50">
      <div className="flex items-start gap-2">
        <User className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-foreground leading-relaxed">{profile.summary}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-background rounded-lg p-2 text-center min-w-0">
          <Scale className="w-3 h-3 mx-auto text-muted-foreground mb-1" />
          <p className={`text-sm font-bold ${bmiColor}`}>{profile.bmi}</p>
          <p className="text-[9px] text-muted-foreground">IMC</p>
        </div>
        <div className="bg-background rounded-lg p-2 text-center min-w-0">
          <Flame className="w-3 h-3 mx-auto text-muted-foreground mb-1" />
          <p className="text-sm font-bold">{profile.tmb}</p>
          <p className="text-[9px] text-muted-foreground">TMB</p>
        </div>
        <div className="bg-background rounded-lg p-2 text-center min-w-0">
          <Activity className="w-3 h-3 mx-auto text-muted-foreground mb-1" />
          <p className="text-sm font-bold">{profile.tdee}</p>
          <p className="text-[9px] text-muted-foreground">TDEE</p>
        </div>
        <div className="bg-background rounded-lg p-2 text-center min-w-0 flex flex-col items-center justify-center">
          <Badge variant="outline" className="text-[8px] px-1 py-0 truncate max-w-full">{profile.bmiCategory}</Badge>
          <p className="text-[9px] text-muted-foreground mt-1 truncate max-w-full">{profile.metabolicType}</p>
        </div>
      </div>
    </div>
  );
}
