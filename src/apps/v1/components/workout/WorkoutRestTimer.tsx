import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Progress } from "@v1/components/ui/progress";
import { Timer, Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";

interface Props {
  trainingType?: string;
  onComplete?: () => void;
}

const REST_PRESETS: Record<string, { label: string; seconds: number; description: string }> = {
  hypertrophy: { label: "Hipertrofia", seconds: 90, description: "60-120s para estresse metabólico" },
  strength: { label: "Força", seconds: 180, description: "3-5min para recuperação neural" },
  endurance: { label: "Resistência", seconds: 45, description: "30-60s para alta densidade" },
  circuit: { label: "Circuito", seconds: 30, description: "15-30s entre exercícios" },
  biset: { label: "Biset", seconds: 60, description: "Sem descanso entre exercícios, 60s entre séries" },
  flexibility: { label: "Flexibilidade", seconds: 30, description: "Transição rápida" },
};

export default function WorkoutRestTimer({ trainingType = "hypertrophy", onComplete }: Props) {
  const preset = REST_PRESETS[trainingType] || REST_PRESETS.hypertrophy;
  const [totalSeconds, setTotalSeconds] = useState(preset.seconds);
  const [remaining, setRemaining] = useState(preset.seconds);
  const [running, setRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const p = REST_PRESETS[trainingType] || REST_PRESETS.hypertrophy;
    setTotalSeconds(p.seconds);
    setRemaining(p.seconds);
    setRunning(false);
  }, [trainingType]);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            setRunning(false);
            if (soundEnabled) playBeep();
            onComplete?.();
            return 0;
          }
          if (prev === 4 && soundEnabled) playTick();
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, soundEnabled]);

  const playBeep = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  const playTick = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      gain.gain.value = 0.1;
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const progress = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;

  const adjustTime = (delta: number) => {
    const newTotal = Math.max(10, totalSeconds + delta);
    setTotalSeconds(newTotal);
    if (!running) setRemaining(newTotal);
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Timer de Descanso</span>
          </div>
          <Badge variant="outline" className="text-xs">{preset.label}</Badge>
        </div>

        <p className="text-[11px] text-muted-foreground">{preset.description}</p>

        <div className="text-center">
          <span className={`text-4xl font-mono font-bold ${remaining <= 3 && running ? "text-destructive animate-pulse" : "text-foreground"}`}>
            {formatTime(remaining)}
          </span>
        </div>

        <Progress value={progress} className="h-2" />

        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => adjustTime(-15)} disabled={running}>-15s</Button>
          <Button
            size="sm"
            className="gap-1 min-w-[80px]"
            onClick={() => setRunning(!running)}
          >
            {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {running ? "Pausar" : "Iniciar"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setRemaining(totalSeconds); setRunning(false); }}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => adjustTime(15)} disabled={running}>+15s</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
