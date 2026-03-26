import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Zap, Play, Pause, SkipForward, RotateCcw, CheckCircle2, Timer, Volume2, VolumeX } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds?: number;
  group_type?: string;
  group_id?: string;
  group_order?: number;
}

interface Props {
  exercises: Exercise[];
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

type Phase = "exercise" | "rest" | "complete";

export default function SupersetTimer({ exercises, open, onClose, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<Phase>("exercise");
  const [restTime, setRestTime] = useState(0);
  const [maxRest, setMaxRest] = useState(60);
  const [running, setRunning] = useState(false);
  const [exerciseTime, setExerciseTime] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentEx = exercises[currentIndex];
  const totalExercises = exercises.length;

  useEffect(() => {
    if (!open) {
      setCurrentIndex(0);
      setCurrentSet(1);
      setPhase("exercise");
      setRestTime(0);
      setExerciseTime(0);
      setRunning(false);
    }
  }, [open]);

  useEffect(() => {
    if (running && phase === "exercise") {
      intervalRef.current = setInterval(() => {
        setExerciseTime(prev => prev + 1);
      }, 1000);
    } else if (running && phase === "rest") {
      intervalRef.current = setInterval(() => {
        setRestTime(prev => {
          if (prev <= 1) {
            setRunning(false);
            if (soundEnabled) playBeep();
            advanceAfterRest();
            return 0;
          }
          if (prev === 4 && soundEnabled) playTick();
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase]);

  const playBeep = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; gain.gain.value = 0.3;
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  const playTick = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 440; gain.gain.value = 0.1;
      osc.start(); osc.stop(ctx.currentTime + 0.08);
    } catch {}
  };

  const advanceAfterRest = useCallback(() => {
    const isGrouped = currentEx?.group_type && currentEx.group_type !== "single";

    if (isGrouped) {
      // In a group: advance to next exercise in group, or next set
      const groupExercises = exercises.filter(e => e.group_id === currentEx.group_id);
      const posInGroup = groupExercises.findIndex(e => e.id === currentEx.id);

      if (posInGroup < groupExercises.length - 1) {
        // Next exercise in group (no rest between group exercises)
        setCurrentIndex(exercises.findIndex(e => e.id === groupExercises[posInGroup + 1].id));
      } else if (currentSet < (currentEx.sets || 3)) {
        // Back to first exercise in group for next set
        setCurrentSet(prev => prev + 1);
        setCurrentIndex(exercises.findIndex(e => e.id === groupExercises[0].id));
      } else {
        // Group complete, move to next non-group exercise
        const lastGroupIdx = exercises.findIndex(e => e.id === groupExercises[groupExercises.length - 1].id);
        if (lastGroupIdx + 1 < totalExercises) {
          setCurrentIndex(lastGroupIdx + 1);
          setCurrentSet(1);
        } else {
          setPhase("complete");
          return;
        }
      }
    } else {
      if (currentSet < (currentEx?.sets || 3)) {
        setCurrentSet(prev => prev + 1);
      } else if (currentIndex + 1 < totalExercises) {
        setCurrentIndex(prev => prev + 1);
        setCurrentSet(1);
      } else {
        setPhase("complete");
        return;
      }
    }

    setPhase("exercise");
    setExerciseTime(0);
  }, [currentEx, currentIndex, currentSet, exercises, totalExercises]);

  const markSetDone = () => {
    const rest = currentEx?.rest_seconds || 60;
    setMaxRest(rest);
    setRestTime(rest);
    setPhase("rest");
    setRunning(true);
    setExerciseTime(0);
  };

  const skipRest = () => {
    setRunning(false);
    setRestTime(0);
    advanceAfterRest();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const overallProgress = totalExercises > 0 ? ((currentIndex + (currentSet - 1) / (currentEx?.sets || 3)) / totalExercises) * 100 : 0;

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Modo Execução Guiada
          </DialogTitle>
        </DialogHeader>

        {phase === "complete" ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h3 className="text-xl font-bold">Treino Completo! 🎉</h3>
            <p className="text-sm text-muted-foreground">Todos os exercícios foram executados</p>
            <Button onClick={() => { onComplete?.(); onClose(); }}>Finalizar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Progress value={overallProgress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Exercício {currentIndex + 1}/{totalExercises}</span>
              <span>Série {currentSet}/{currentEx?.sets || 3}</span>
            </div>

            {phase === "exercise" ? (
              <Card className="border-primary/30">
                <CardContent className="p-4 text-center space-y-3">
                  {currentEx?.group_type && currentEx.group_type !== "single" && (
                    <Badge className="text-xs">{currentEx.group_type.toUpperCase()}</Badge>
                  )}
                  <h3 className="text-xl font-bold">{currentEx?.name}</h3>
                  <div className="flex justify-center gap-4 text-sm">
                    <span className="text-muted-foreground">Reps: <strong>{currentEx?.reps}</strong></span>
                    {(currentEx as any)?.load_kg && (
                      <span className="text-muted-foreground">Carga: <strong>{(currentEx as any).load_kg}kg</strong></span>
                    )}
                  </div>
                  <div className="text-2xl font-mono text-muted-foreground">
                    <Timer className="w-4 h-4 inline mr-1" />
                    {formatTime(exerciseTime)}
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={() => setRunning(!running)}>
                      {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button onClick={markSetDone} className="gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Série Feita
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="p-4 text-center space-y-3">
                  <Badge variant="outline" className="text-yellow-600">Descanso</Badge>
                  <div className={`text-5xl font-mono font-bold ${restTime <= 3 ? "text-destructive animate-pulse" : "text-foreground"}`}>
                    {formatTime(restTime)}
                  </div>
                  <Progress value={maxRest > 0 ? ((maxRest - restTime) / maxRest) * 100 : 0} className="h-2" />
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={() => setRunning(!running)}>
                      {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={skipRest} className="gap-1">
                      <SkipForward className="w-4 h-4" /> Pular
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSoundEnabled(!soundEnabled)}>
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
