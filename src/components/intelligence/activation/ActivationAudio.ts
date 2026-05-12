/**
 * Neural activation audio — binaural-inspired ambient tone
 * with crescendo on climax and gentle fadeout.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let oscillators: OscillatorNode[] = [];

export function startNeuralAmbient() {
  try {
    if (localStorage.getItem("fj_audio_muted") === "1") return;
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 1);
    masterGain.connect(ctx.destination);

    // Base drone - low frequency
    const freqs = [110, 110.5, 220, 329.63]; // slight detuning for binaural feel
    freqs.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const g = ctx!.createGain();
      osc.type = i < 2 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, ctx!.currentTime);
      g.gain.setValueAtTime(i < 2 ? 0.4 : 0.1, ctx!.currentTime);
      osc.connect(g).connect(masterGain!);
      osc.start();
      oscillators.push(osc);
    });
  } catch { /* Web Audio unavailable */ }
}

export function crescendo() {
  if (!ctx || !masterGain) return;
  try {
    masterGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.8);
    // Add harmonic burst
    const burst = ctx.createOscillator();
    const bg = ctx.createGain();
    burst.type = "sine";
    burst.frequency.setValueAtTime(880, ctx.currentTime);
    bg.gain.setValueAtTime(0, ctx.currentTime);
    bg.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.3);
    bg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    burst.connect(bg).connect(ctx.destination);
    burst.start();
    burst.stop(ctx.currentTime + 1.5);
  } catch {}
}

export function fadeOutAudio() {
  if (!ctx || !masterGain) return;
  try {
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    setTimeout(() => {
      oscillators.forEach(o => { try { o.stop(); } catch {} });
      oscillators = [];
      try { ctx?.close(); } catch {}
      ctx = null;
      masterGain = null;
    }, 2000);
  } catch {}
}

export function microVibrate(ms = 10) {
  try { navigator?.vibrate?.(ms); } catch {}
}
