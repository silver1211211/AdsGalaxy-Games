export type SoundName = "flip" | "match" | "wrong" | "victory" | "countdown";

export function playSound(name: SoundName, muted: boolean) {
  if (muted || typeof window === "undefined") return;
  const AudioCtx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const context = new AudioCtx();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const settings: Record<SoundName, [number, number]> = {
    flip: [330, .035], match: [660, .09], wrong: [170, .08], victory: [880, .18], countdown: [440, .06]
  };
  oscillator.frequency.value = settings[name][0];
  oscillator.type = name === "wrong" ? "sawtooth" : "sine";
  gain.gain.setValueAtTime(.035, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + settings[name][1]);
  oscillator.connect(gain); gain.connect(context.destination);
  oscillator.start(); oscillator.stop(context.currentTime + settings[name][1]);
  oscillator.addEventListener("ended", () => void context.close());
}
